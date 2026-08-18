# PHASE 4 — Production Hardening Plan

**Status:** READY FOR GPT VERIFICATION
**Date:** 2026-08-15
**Phase 1–3:** LOCKED AND PASSED

---

## 1. Current Production Topology

```
Caddy (gateway :443/:80)
  → Next.js single process (:3000)
    → Prisma pool (10 conn)
      → PostgreSQL single instance (:5432)
```

- 1 app instance, 1 DB instance, no replicas, no PgBouncer
- In-memory rate limiting (not shared across instances)
- Backup/restore scripts exist but no scheduled execution
- Health probes exist (`/health`, `/health/live`, `/health/ready`)
- Graceful shutdown with 5s drain period
- Retry on transient DB errors (read-only queries only)

---

## 2. Multi-Instance Strategy

**Phase 4 scope:** Validate multi-instance compatibility. Do NOT deploy.

| Concern | Current | Action |
|---------|---------|--------|
| Rate limiting | In-memory `Map` | Replace with PostgreSQL-backed atomic fixed-window counter (see §3) |
| Session | JWT cookie (stateless) | ✅ Already multi-instance compatible |
| File uploads | In-memory `formData` | ✅ Already multi-instance compatible |
| Health probes | Per-instance, stateless | ✅ Already multi-instance compatible |
| Graceful shutdown | Per-instance drain | ✅ Already multi-instance compatible |

**Connection budget for N instances:**
```
total = (N × 10) + 5 ≤ 80  →  N ≤ 7 instances at max_connections=100
```

---

## 3. Rate Limiter Strategy

**Decision: PostgreSQL-backed atomic fixed-window counter.**

Rationale: The app already depends on PostgreSQL. Adding Redis creates a new dependency for a feature that executes ~6 checks per request. PostgreSQL can handle this at current scale.

**Implementation:**
- Table: `RateLimitEntry { key: String @id, count: Int, windowStart: DateTime, windowEnd: DateTime }`
- **Atomic fixed-window counter**: single SQL `INSERT ... ON CONFLICT DO UPDATE SET count = count + 1` where `windowEnd > now()`; if window expired, reset `count = 1` and advance window
- This is a **fixed-window counter** (not a true sliding window). Simpler, correct, and sufficient. Switch to sliding window only if testing proves boundary-burst is a real problem.
- Cleanup: periodic delete of expired entries (every 60s via `setInterval`)
- Same API surface: `rateLimit(key, config)` — drop-in replacement

### 3.1 Fail Policy Per Endpoint Category

DB unreachable must NOT create unlimited authentication attempts.

| Category | Policy | DB Unavailable Behavior | Endpoints
|----------|--------|------------------------|----------
| **Security-sensitive** | FAIL-CLOSED | **Reject** (429 with static emergency limit) | `POST /api/auth` (login), `POST /api/auth/setup`, `POST /api/auth/change-password` |
| **Mutations** | SAFE EMERGENCY LIMIT | Allow with reduced static limit (1/min) | `POST /api/claims`, `POST /api/claims/bulk-edit`, `POST /api/crews/batch-import`, `POST /api/tiktok-sales/import`, `DELETE /api/data/clear-all` |
| **Low-risk reads** | FAIL-OPEN | **Allow** (log warning) | `GET /api/dashboard`, `GET /api/claims/search`, `GET /api/groups`, `GET /api/crews`, `GET /api/export` |
| **Health / public** | FAIL-OPEN | **Allow** (no rate limit) | `GET /api/health`, `GET /api/health/live`, `GET /api/health/ready` |

**Static emergency limits** (applied when DB unreachable for security-sensitive endpoints):
- Login: 3 attempts per 15 min (hardcoded fallback)
- Setup: 1 attempt per hour (hardcoded fallback)
- Password change: 2 attempts per 15 min (hardcoded fallback)

**When to switch to Redis:**
- Rate limit queries exceed 100 QPS aggregate
- P99 latency of rate limit check > 5ms
- Connection pool exhaustion observed from rate limit queries

Evidence-based migration, not premature optimization.

---

## 4. Snapshot/Restore Operational Flow

```
Schedule (cron):
  02:00 daily  → backup-postgres.ts     → ./backups/ (+ S3 upload)
  02:30 daily  → restore-verify.ts      → against restored copy
  03:00 weekly → snapshot-app.ts        → ./snapshots/ (+ S3 upload)

Pre-migration:
  1. snapshot-app.ts (JSON export of current data)
  2. backup-postgres.ts (full binary backup)
  3. Run restore-verify.ts against backup
  4. Apply migration
  5. Run restore-verify.ts against live DB
  6. If failed → pg_restore from step 2

Emergency restore:
  1. pg_restore from latest .backup file
  2. restore-verify.ts (must pass all 5 checks)
  3. Restart application
```

**Verification gates:** Backup is invalid until `restore-verify.ts` exits 0.

---

## 5. Load Test Methodology

**Tool:** `k6` (Grafana k6 — scriptable JS, HTTP load testing)

| Scenario | Target | Metric |
|----------|--------|--------|
| Dashboard load | 50 concurrent users | P95 < 500ms |
| Claims search | 100 RPS | P95 < 200ms |
| CSV export | 10 concurrent | P95 < 5s, no OOM |
| Import (500 rows) | 5 concurrent | P95 < 10s |
| Health endpoint | 200 RPS | P99 < 10ms |
| Login | 20 RPS | P95 < 300ms |

**Data setup:** Seed with 1000 crews, 50,000 sales, 5,000 TikTokSales.

**Procedure:**
1. Ramp-up 1→target over 30s
2. Sustain target for 60s
3. Ramp-down over 10s
4. Collect: RPS, P50/P95/P99 latency, error rate, DB connections

**Acceptance:** Error rate < 0.1%, no 5xx responses, no OOM.

---

## 6. Target RTO/RPO

| Scenario | RTO | RPO | Method |
|----------|-----|-----|--------|
| App crash/restart | < 30s | 0 | Process manager restart |
| App rolling deploy | < 60s | 0 | Drain → restart |
| DB transient failure | < 10s | 0 | Automatic retry + reconnect |
| DB restore from backup | ≤ 30 min | ≤ 24h | pg_dump daily backup |
| Full DR | ≤ 4h | ≤ 24h | Off-site backup + new infra |

**HA failover RTO (future, not Phase 4):** 1–5 min, RPO 0.

---

## 7. Failure Scenarios to Test

| # | Scenario | Inject | Expected Behavior |
|---|----------|--------|-------------------|
| F1 | DB unreachable | `pg_ctl stop` | `/health/ready` → 503, reads retry, mutations fail gracefully |
| F2 | DB connection exhaustion | Lower `max_connections` to 15 | P1008 errors, `/health/ready` → 503, no crash |
| F3 | Slow DB (latency > 1s) | `pg_sleep` in query | `/health` → degraded, requests still served |
| F4 | SIGTERM during request | `kill -SIGTERM <pid>` | Drain completes, 503 during drain, then exit |
| F5 | Concurrent admin setup | 2 simultaneous POST /auth/setup | One succeeds, other gets P2002 → 403 |
| F6 | Rate limit exceeded | Burst 100 login attempts | 429 after 5th attempt, headers show reset time |
| F7 | Large import during DB stress | Import 5000 rows + slow DB | Import succeeds (no retry), no data corruption |

---

## 8. PostgreSQL Bottlenecks to Measure

| Query | Current | Risk | Measurement |
|-------|---------|------|-------------|
| Dashboard `groupBy` by crewId | Scans Sale with tanggal filter | Medium | `EXPLAIN ANALYZE` with 50k rows |
| Struk count `DISTINCT idPenjualan` | Raw SQL, no covering index | Medium | `EXPLAIN ANALYZE`, check if index-only scan |
| Claims search `ILIKE` | 4 OR conditions with mode:insensitive | High | `EXPLAIN ANALYZE`, check seq scan vs index |
| Export-all `findMany` | Full table scan, 100k limit | Medium | Measure memory + query time |
| `tiktok-sales/import` batch | `createMany` 200 rows/chunk | Low | Measure chunk insert time |
| Rate limit upsert (new) | Hot row per key | Medium | Measure under 200 RPS |

**Index candidates to evaluate:**
- `Sale(crewId, tanggal)` — composite for dashboard groupBy
- `Sale(idPenjualan, crewId)` — covering for struk count
- `TikTokSale(crewId, tanggal, status)` — composite for group-detail

---

## 9. What Will NOT Be Implemented

| Excluded | Reason |
|----------|--------|
| Redis | PostgreSQL-backed rate limiting first; migrate only if evidence demands it |
| HA / automatic failover | Infrastructure not available; documented architecture only |
| PgBouncer | Needed only at >4 instances; single-instance is Phase 4 target |
| Read replicas | No infrastructure; document for future |
| Microservices / K8s / Kafka | Scope creep; explicitly forbidden |
| Sharding / CQRS / event sourcing | Scale not needed; premature |
| Float → Decimal migration | Schema change; separate phase after data validation |
| String tanggal → DATE | Schema change; separate phase after data validation |

---

## 10. Phase 4 Acceptance Criteria

| # | Criterion | Evidence Required |
|---|-----------|-------------------|
| AC1 | PostgreSQL-backed rate limiter replaces in-memory | Unit test + multi-instance simulation |
| AC2 | Rate limiter fail policy enforced per endpoint category | Test: security endpoints reject on DB down; reads allow; mutations use emergency limit |
| AC3 | Load test passes all scenarios in §5 | k6 report with P95/RPS/error rate |
| AC4 | Failure scenarios F1–F7 pass | Test log for each scenario |
| AC5 | Backup → restore → verify passes end-to-end | Cron output + restore-verify exit 0 |
| AC6 | No regression in Phase 1–3 guarantees | Auth, JWT, P2002, case-insensitive search still work |
| AC7 | Production build succeeds | `next build` exits 0 |
| AC8 | Health probes correct under all states | ok/degraded/draining/unhealthy verified |
| AC9 | Pool sizing formula validated with load test | Connection count ≤ 80% of max_connections |
| AC10 | PHASE-4-IMPLEMENTATION.md delivered | All criteria documented with evidence |

---

**PHASE 4 STATUS: READY FOR GPT VERIFICATION**
