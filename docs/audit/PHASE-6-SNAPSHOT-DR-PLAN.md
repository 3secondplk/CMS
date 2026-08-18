# Phase 6 — Snapshot & Disaster Recovery Plan

Phase 0–5: LOCKED. No re-audit.

## Current State (Phase 3–4)

- **backup-postgres.ts**: pg_dump -Fc, SHA-256 checksum, .meta.json, 7-day retention
- **restore-verify.ts**: 5-check verification (schema, rows, FK, indexes, connectivity)
- **snapshot-app.ts**: JSON export, SHA-256, schema version from _prisma_migrations
- **Gaps**: No cron, no S3 upload, no failure alerting, no corrupted-backup detection

## 1. Backup Scheduling

**System crontab** (not in-app — must run even if app is down):
```
02:00 daily  → backup-postgres.ts → local + S3
02:30 daily  → restore-verify.ts against disposable restore
03:00 weekly (Sun) → snapshot-app.ts → local + S3
```
**Concurrency guard**: PID lock file `/tmp/cms3sc-backup.lock`. Prevent overlapping runs.

## 2. Off-Site Backup Architecture

**Target**: S3-compatible (AWS S3, Cloudflare R2, MinIO).

**Upload flow**: pg_dump → local → SHA-256 validate → S3 upload → HEAD verify ETag → delete local.

**Bucket layout**:
```
s3://cms3sc-backups/
  backups/2026/03/15/cms3sc_20260315020000.backup
  backups/2026/03/15/cms3sc_20260315020000.meta.json
  snapshots/2026/03/15/snapshot_20260315030000.json
  manifest.json
```

## 3. Application Snapshot

**Fixes**: Add ActivityLog + RateLimitEntry to export. Remove silent 100k row cap. Populate schemaVersion from _prisma_migrations (snapshot-app.ts already does this; backup-postgres.ts hardcodes 'unknown').

**Snapshot vs backup**: pg_dump = primary restore (binary, includes indexes/constraints). Snapshot = secondary (JSON, for migration/debugging only).

## 4. Manifest + Checksum

After each backup, update `manifest.json` listing all valid backups with checksums, schema versions, S3 keys, and verify results. Fix schemaVersion: query `_prisma_migrations` for latest migration name instead of hardcoding 'unknown'.

## 5. Retention

| Type | Local | S3 | Policy |
|------|-------|----|--------|
| Daily backup | 7 | 30 | Delete oldest beyond count |
| Weekly snapshot | 5 | 12 | Delete oldest beyond count |
| Monthly archive | — | ∞ | Never auto-delete (tag `archive=true`) |

S3 lifecycle: Glacier after 90d, delete after 365d (unless `archive=true`).

## 6. Backup Failure Detection

**Failure signals**: script exit ≠0, file missing/empty, SHA-256 mismatch, S3 upload error, verify exit ≠0, no backup in >25h.

**Alerting**: Webhook POST to ops channel (Slack/Discord). Include timestamp, error, last successful backup time. **No** Redis/Kafka — simple HTTP POST.

**Health check**: `GET /api/health/backups` → `{ lastBackupAt, lastBackupStatus, staleHours }`.

## 7. Restore Runbook

```
1. manifest.json → newest backup with verifyExitCode=0
2. Download from S3 (or local)
3. Validate SHA-256: sha256sum .backup = .meta.json.checksum
4. pg_restore -h host -U user -d cms3sc_restore -1 file.backup
5. DATABASE_URL=... bun run scripts/restore-verify.ts
6. Verify passes → swap DB URL to cms3sc_restore
7. Verify fails → DO NOT swap. Try next backup. Max 3 attempts.
```

## 8. RTO/RPO Validation

| Scenario | Target RTO | Target RPO | Current | Gap |
|----------|-----------|-----------|---------|-----|
| App crash | <30s | 0 | <30s ✅ | None |
| DB transient | <10s | 0 | <10s ✅ | None |
| DB restore | ≤30min | ≤24h | 15–30min ✅ | Needs cron+verify |
| Corrupted DB | ≤30min | ≤24h | Manual | Needs cron+verify |
| Full DR | ≤4h | ≤24h | ∞ manual | Needs S3+runbook |

## 9. Disaster Recovery Drill

**Quarterly procedure**: (1) Select random S3 backup. (2) Provision disposable PostgreSQL. (3) Run restore runbook — time each step. (4) restore-verify.ts — confirm exit 0. (5) Start app — confirm /api/health 200. (6) Smoke tests: login, search, dashboard. (7) Record actual RTO. (8) Tear down. (9) Document in `docs/audit/DR-DRILL-YYYY-MM-DD.md`.

**Acceptance**: RTO ≤30min (DB restore), ≤4h (full DR).

## 10. Corrupted Backup Detection

**Layers**: (1) SHA-256 mismatch → REJECT. (2) `pg_restore --list` exit ≠0 → REJECT (structural corruption). (3) restore-verify.ts 5-check failure → REJECT. (4) No backup in >25h → ALERT. (5) Size <50% of previous → ALERT (partial dump).

**Handling**: Mark `retentionStatus:"corrupt"` in manifest. Do NOT delete (forensics). Alert ops. Skip in restore fallback chain.

---

PHASE 6 STATUS: READY FOR GPT VERIFICATION
