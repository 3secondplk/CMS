# PHASE 2 — PostgreSQL Foundation Plan

**Author:** GLM (Developer)
**Status:** READY FOR GPT VERIFICATION
**Date:** 2025-07-14
**Scope:** Database foundation ONLY. No application redesign. No HA/replicas/PgBouncer in this phase.

---

## Table of Contents

1. [Current SQLite Architecture](#1-current-sqlite-architecture)
2. [Existing PostgreSQL Schema Status](#2-existing-postgresql-schema-status)
3. [Schema Differences](#3-schema-differences)
4. [Type Differences](#4-type-differences)
5. [Constraint Differences](#5-constraint-differences)
6. [Index Differences](#6-index-differences)
7. [Relation Behavior Differences](#7-relation-behavior-differences)
8. [Query Compatibility Issues](#8-query-compatibility-issues)
9. [Transaction Compatibility Issues](#9-transaction-compatibility-issues)
10. [Seed/Data Migration Requirements](#10-seeddata-migration-requirements)
11. [Environment/Configuration Changes](#11-environmentconfiguration-changes)
12. [Rollback Strategy](#12-rollback-strategy)
13. [Data Integrity Verification Strategy](#13-data-integrity-verification-strategy)
14. [Connection/Pooling Requirements](#14-connectionpooling-requirements)
15. [Health-Check Requirements](#15-health-check-requirements)
16. [Risks/Blockers](#16-risksblockers)

---

## 1. Current SQLite Architecture

### Datasource
- **Provider:** `sqlite`
- **URL format:** `file:./dev.db` (schema) / `file:/home/z/my-project/db/custom.db` (runtime .env)
- **File location:** `prisma/dev.db` (schema default), `db/custom.db` (runtime override)
- **Prisma Client:** `@prisma/client` ^6.11.1

### Models (6 total)

| Model | Primary Key | Unique Constraints | Foreign Keys | Indexes | Records (seed) |
|-------|------------|-------------------|-------------|---------|----------------|
| **Admin** | `id` (cuid) | `username` | — | — | 1 |
| **Group** | `id` (cuid) | — | — | — | 3 |
| **Crew** | `id` (cuid) | `employeeId` | `groupId → Group.id` (CASCADE) | — | 6 |
| **Sale** | `id` (cuid) | — | `crewId → Crew.id` (SET NULL) | 6 composite/single indexes | ~200 |
| **TikTokSale** | `id` (cuid) | — | `crewId → Crew.id` (SET NULL) | 4 indexes | 0 (seed doesn't create) |
| **ActivityLog** | `id` (cuid) | — | — | — | varies |

### Client Singleton Pattern
**File:** `src/lib/db.ts`
```ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```
- **Dev:** Caches PrismaClient on `globalThis` to prevent hot-reload connection leaks
- **Prod:** Creates new PrismaClient each time (no caching) — **acceptable for single-instance Node, but needs review for multi-instance serverless**

### SQLite-Specific Behaviors
1. **Case-insensitive LIKE:** SQLite `LIKE` is ASCII-case-insensitive by default. PostgreSQL `LIKE` is case-sensitive.
2. **Single-writer concurrency:** SQLite uses file-level locking. Only one write at a time.
3. **No real transaction isolation levels:** SQLite has `SERIALIZABLE` only, but it's file-lock-based.
4. **`tanggal` stored as String:** Dates stored as `YYYY-MM-DD` strings, queried with `LIKE '2025-01-%'` patterns.
5. **FLOAT precision:** SQLite stores all numerics as 8-byte IEEE 754 doubles internally. No `REAL` vs `DOUBLE PRECISION` distinction.
6. **Migration SQL:** `IF NOT EXISTS` used in migration — PostgreSQL supports this syntax but it's not standard practice with Prisma managed migrations.

---

## 2. Existing PostgreSQL Schema Status

### Status: NOT PRESENT

There is **no** `prisma/schema.postgresql.prisma` file. No PostgreSQL-specific schema exists.

**However**, the current `schema.prisma` header comment says:
```
// CMS Crew Management System — Prisma Schema (PostgreSQL)
// Deploy ke Vercel dengan Neon / Supabase / Railway DB
```
This is a **misleading remnant** — the schema is SQLite, but the original intent was PostgreSQL. The models and relations are already designed with PostgreSQL-compatible conventions (cuid IDs, DateTime fields, proper relations).

### Migration Directory
- `prisma/migrations/20260704000000_add_week5_target/migration.sql` — one migration adding `week5Target` column
- `prisma/migrations/migration_lock.toml` — Prisma migration lock file

The existing migration is SQLite-specific (uses `IF NOT EXISTS` syntax).

**Conclusion:** The schema will need to be regenerated for PostgreSQL from scratch using `prisma migrate dev` or `prisma migrate deploy`. The existing migration history is SQLite-only and cannot be reused.

---

## 3. Schema Differences

### Schema as-is (SQLite → PostgreSQL conversion)

All Prisma model definitions are **provider-agnostic** — they use only standard Prisma SDL features:
- `@id @default(cuid())` — works on both providers
- `@unique` — works on both providers
- `@relation` with `fields`, `references`, `onDelete` — works on both providers
- `@default(now())`, `@updatedAt` — works on both providers
- `String`, `Int`, `Float`, `Boolean`, `DateTime` — all cross-provider

**No schema changes required** for the model definitions themselves. The only change is:

```diff
datasource db {
-  provider = "sqlite"
-  url      = "file:./dev.db"
+  provider = "postgresql"
+  url      = env("DATABASE_URL")
}
```

### Explicit model review

#### Admin
- `id String @id @default(cuid())` — ✅ PostgreSQL-compatible
- `username String @unique` — ✅ Creates unique index
- `password String` — ✅ No length constraint (should consider adding `@db.Text` or length limit in Phase 3)
- `createdAt DateTime @default(now())` — ✅ Maps to `TIMESTAMP(3)`
- `updatedAt DateTime @updatedAt` — ✅ Maps to `TIMESTAMP(3)`

#### Group
- `monthlyTarget Float @default(0)` — ⚠️ **Float maps to `DOUBLE PRECISION`** in PostgreSQL. For financial targets, `Decimal` would be more precise. **Deferred to Phase 3** — no schema change now.
- `week1Target` through `week5Target` — same Float concern
- `crews Crew[]` — ✅ One-to-many relation

#### Crew
- `employeeId String @unique` — ✅
- `groupId String` + `group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)` — ✅ Cascade delete is PostgreSQL-compatible
- `sales Sale[]` + `tiktokSales TikTokSale[]` — ✅ One-to-many

#### Sale
- `crewId String?` + `crew Crew? @relation(fields: [crewId], references: [id], onDelete: SetNull)` — ✅ Optional FK with SET NULL
- `tanggal String` — ⚠️ Stored as string, not Date. Works on both providers. No change.
- All `Float` fields (hjp, netto, diskon, etc.) — ⚠️ Same Float precision concern as Group. Deferred.
- 6 indexes — ✅ All cross-provider compatible

#### TikTokSale
- Same patterns as Sale — ✅ PostgreSQL-compatible
- 4 indexes — ✅

#### ActivityLog
- Simple model, no FKs — ✅

---

## 4. Type Differences

| Prisma Type | SQLite Mapping | PostgreSQL Mapping | Issue? |
|-------------|---------------|-------------------|--------|
| `String` | `TEXT` | `TEXT` (unlimited) | ⚠️ No length limit in PostgreSQL. Should add `@db.VarChar(n)` for constrained fields in Phase 3. |
| `Int` | `INTEGER` | `INTEGER` | ✅ No issue |
| `Float` | `REAL` (8-byte IEEE 754) | `DOUBLE PRECISION` (8-byte IEEE 754) | ⚠️ Same binary representation, but PostgreSQL has `NUMERIC`/`DECIMAL` for exact arithmetic. Float rounding differences possible. Deferred to Phase 3. |
| `Boolean` | `INTEGER` (0/1) | `BOOLEAN` | ✅ Prisma handles transparently |
| `DateTime` | `TEXT` (ISO 8601 string) | `TIMESTAMP(3)` | ✅ Prisma handles transparently |

### Critical: `tanggal` Field
The `tanggal` field on Sale and TikTokSale is `String`, storing dates as `YYYY-MM-DD`. This is queried with:
- `LIKE '2025-01-01%'` patterns in raw SQL
- `{ tanggal: { gte: '2025-01-01' } }` in Prisma queries

**PostgreSQL behavior:** String comparison on `TEXT` follows locale-aware collation. For ISO 8601 date strings (`YYYY-MM-DD`), lexicographic ordering matches chronological ordering. **No issue.**

**PostgreSQL `LIKE` behavior:** Case-sensitive by default (unlike SQLite). Since `tanggal` values are always lowercase digits and hyphens, **LIKE will produce identical results**. No `ILIKE` needed.

---

## 5. Constraint Differences

| Constraint | SQLite | PostgreSQL | Issue? |
|-----------|--------|-----------|--------|
| `@id @default(cuid())` | `TEXT PRIMARY KEY` | `TEXT PRIMARY KEY` | ✅ Same |
| `@unique` | `UNIQUE` index | `UNIQUE` constraint + index | ✅ Same behavior |
| `onDelete: Cascade` | `FOREIGN KEY ... ON DELETE CASCADE` | Same | ✅ |
| `onDelete: SetNull` | `FOREIGN KEY ... ON DELETE SET NULL` | Same | ✅ |
| Nullable (`String?`) | No `NOT NULL` constraint | `NULL` allowed | ✅ Same |
| Not-null (`String`) | `NOT NULL` | `NOT NULL` | ✅ Same |
| `@default(now())` | Default via Prisma | `DEFAULT NOW()` | ✅ Same |

### FK Enforcement
- **SQLite:** Foreign keys are **disabled by default** (`PRAGMA foreign_keys = OFF`). Prisma enables them, but this is a runtime setting.
- **PostgreSQL:** Foreign keys are **always enforced** at the database level. This is **stricter** and may reveal data integrity issues that SQLite allowed (orphaned rows).

**Risk:** If the SQLite database has any orphaned FK references (e.g., `Sale.crewId` pointing to a deleted Crew), PostgreSQL will reject the data import. **Pre-migration FK integrity check required.**

---

## 6. Index Differences

### Current Indexes (from schema)

**Sale:**
| Index | Definition |
|-------|-----------|
| `@@index([tanggal])` | Single-column B-tree |
| `@@index([kodeExtend])` | Single-column B-tree |
| `@@index([crewId])` | Single-column B-tree |
| `@@index([program])` | Single-column B-tree |
| `@@index([tanggal, kodeExtend])` | Composite B-tree |
| `@@index([idPenjualan])` | Single-column B-tree |

**TikTokSale:**
| Index | Definition |
|-------|-----------|
| `@@index([tanggal])` | Single-column B-tree |
| `@@index([crewId])` | Single-column B-tree |
| `@@index([status])` | Single-column B-tree |
| `@@index([idOrder])` | Single-column B-tree |

### PostgreSQL vs SQLite Index Behavior
| Aspect | SQLite | PostgreSQL | Impact |
|--------|--------|-----------|--------|
| Index type | B-tree only | B-tree (default), Hash, GiST, GIN, BRIN | No change needed; B-tree is optimal for these queries |
| Partial indexes | Not in schema | Supported | Could add `WHERE crewId IS NOT NULL` for claim queries in Phase 3 |
| Concurrent creation | N/A | `CREATE INDEX CONCURRENTLY` | Must use for zero-downtime migration |
| Index on nullable | Includes NULLs | Includes NULLs | Same behavior |

**Conclusion:** All existing indexes are cross-provider compatible. No changes needed.

---

## 7. Relation Behavior Differences

### Cascade Delete: `Crew → Group` (onDelete: Cascade)
- **SQLite:** Deleting a Group deletes all its Crews. If those Crews have Sales/TikTokSales, the `SetNull` on Sale.crewId fires first (in Prisma, not at DB level if FK pragma is off).
- **PostgreSQL:** Deleting a Group deletes all its Crews (CASCADE). Before deletion, Sale/TikTokSale rows referencing those Crews will have `crewId` set to NULL (SET NULL). **PostgreSQL enforces this at the DB level.**
- **Risk:** In SQLite with `PRAGMA foreign_keys = OFF`, deleting a Group could leave orphaned Crew rows. PostgreSQL will never allow this. **Pre-migration integrity check required.**

### SetNull: `Sale → Crew` (onDelete: SetNull)
- **Both providers:** When a Crew is deleted, all Sale/TikTokSale rows with that `crewId` get `crewId = NULL`.
- **PostgreSQL:** Enforced at DB level. SQLite: enforced by Prisma (if FK pragma on) or application logic.
- **No behavior change.**

### Optional Relations: `Sale.crewId String?`
- **Both providers:** `crewId` can be NULL (unclaimed sales).
- **No behavior change.**

---

## 8. Query Compatibility Issues

### 8.1 Raw SQL Queries — CRITICAL

**Files affected:**
- `src/app/api/dashboard/route.ts` (4 raw queries, lines 198-221)
- `src/app/api/dashboard/group-detail/route.ts` (1 raw query, line 175)

**Query pattern:**
```sql
SELECT "crewId", COUNT(DISTINCT "idPenjualan") as count
FROM "Sale"
WHERE "crewId" IN (...) AND "idPenjualan" IS NOT NULL AND "tanggal" LIKE '2025-01-01%'
GROUP BY "crewId"
```

**Compatibility analysis:**

| Element | SQLite | PostgreSQL | Compatible? |
|---------|--------|-----------|-------------|
| Double-quoted identifiers `"Sale"`, `"crewId"` | ✅ | ✅ | Yes |
| `Prisma.join()` for IN clause | ✅ | ✅ | Yes |
| `COUNT(DISTINCT "idPenjualan")` | ✅ | ✅ | Yes |
| `"tanggal" LIKE '2025-01-01%'` | Case-insensitive | Case-sensitive | ✅ For this use case (digits/hyphens only) |
| `"idPenjualan" IS NOT NULL` | ✅ | ✅ | Yes |
| `Prisma.sql` tagged template | ✅ | ✅ | Yes |

**Result: Raw queries are PostgreSQL-compatible as-is.** The `LIKE` case-sensitivity difference is irrelevant for `tanggal` (numeric strings only) and `idPenjualan` (alphanumeric but consistent case).

### 8.2 Prisma `contains` Filter — CASE SENSITIVITY

**File:** `src/app/api/claims/search/route.ts`

```ts
// Line 6-8: Comment references SQLite LIKE case-insensitivity
{ kodeExtend: { contains: search.toUpperCase() } },
```

**Behavior:**
- **SQLite:** `contains` → `LIKE '%SEARCH%'` (case-insensitive for ASCII)
- **PostgreSQL:** `contains` → `LIKE '%SEARCH%'` (case-sensitive)

**Impact:** The current code uppercases the search term (`search.toUpperCase()`) and assumes the DB will match case-insensitively. On PostgreSQL, if `kodeExtend` values are stored in mixed case (e.g., `fn001` vs `FN001`), only uppercase entries would match.

**Mitigation options (pick one):**
1. **Use `mode: 'insensitive'`** (Prisma feature for PostgreSQL): `{ kodeExtend: { contains: search, mode: 'insensitive' } }` — **RECOMMENDED**
2. Store `kodeExtend` always uppercase + search uppercase — already partially done
3. Use PostgreSQL `citext` extension — overkill for this case

**Decision:** Add `mode: 'insensitive'` to `contains` filters when migrating to PostgreSQL. This is a Prisma-level change, not a schema change.

### 8.3 `groupBy` Queries

**Used in:** dashboard, claims, claims/search, crews, export, management/report

All use standard Prisma `groupBy` with `_sum`, `_count`, `by` clauses. **PostgreSQL-compatible as-is.**

### 8.4 `aggregate` Queries

**Used in:** dashboard, claims, claims/search, tiktok-sales, management/report

All use standard Prisma `aggregate` with `_sum`, `_count`. **PostgreSQL-compatible as-is.**

### 8.5 `createMany` / `deleteMany` / `updateMany`

**PostgreSQL-compatible as-is.** Prisma translates these to batch SQL regardless of provider.

---

## 9. Transaction Compatibility Issues

### Current Transaction Usage

| Route | Transaction Type | Details |
|-------|-----------------|---------|
| `data/clear-all/route.ts` | `$transaction([...operations])` | Batched sequential transaction. Deletes Sale → ActivityLog → Crew → Group in order. |
| All other routes | **None** | No transaction wrapping |

### SQLite Transaction Behavior
- SQLite transactions are implicitly `SERIALIZABLE` (the only isolation level)
- SQLite uses file-level locking — only one write transaction at a time
- This masked race conditions because concurrent writes are serialized by SQLite itself

### PostgreSQL Transaction Behavior
- PostgreSQL supports `READ COMMITTED` (default), `REPEATABLE READ`, `SERIALIZABLE`
- Multiple concurrent write transactions are allowed
- Without explicit transaction boundaries, each Prisma operation is auto-committed
- **Race conditions that SQLite's single-writer model prevented will surface in PostgreSQL**

### Transaction Isolation Level Requirements

| Operation | Required Isolation | Reason |
|-----------|-------------------|--------|
| Admin setup (count + create) | `SERIALIZABLE` or unique constraint | Prevent duplicate admin creation |
| Claim (updateMany WHERE crewId=null) | `READ COMMITTED` (default) | Already atomic via WHERE clause |
| Bulk edit (read + updateMany) | `REPEATABLE READ` or interactive tx | Prevent stale claimedAt decisions |
| Import (dedup check + createMany) | `READ COMMITTED` + unique constraint | Prevent duplicate rows |
| Data import (deleteMany + create) | `SERIALIZABLE` | Prevent partial state |
| Clear-all (deleteMany batch) | `READ COMMITTED` (current batched tx) | Current pattern works |

### Interactive Transactions
- **Current usage:** NONE
- **PostgreSQL requirement:** Operations with read-then-write patterns need `$transaction` with `{ isolationLevel: ... }` or interactive transactions (`$transaction(async (tx) => { ... })`)
- **Prisma support:** Interactive transactions are fully supported on PostgreSQL

---

## 10. Seed/Data Migration Requirements

### Seed Script (`prisma/seed.ts`)

**Current behavior:**
1. Upserts admin (`admin`/`admin123` — dev only)
2. Upserts 3 groups (Zone A, B, C with fixed IDs)
3. Upserts 6 crews (EMP001-EMP006)
4. **Deletes all existing sales** (`deleteMany`)
5. Generates ~200 sale records with deterministic pseudo-random
6. Inserts sales in batches of 50 (`createMany`)
7. Prints summary statistics

**PostgreSQL compatibility:**
- All operations are standard Prisma — **compatible as-is**
- `createMany` with batch size 50 — ✅ works on PostgreSQL
- `groupBy` for summary stats — ✅ works on PostgreSQL
- `aggregate` for totals — ✅ works on PostgreSQL

**One concern:** The seed calls `db.sale.deleteMany()` unconditionally. In PostgreSQL with FK constraints enforced, this is safe because Sale has no dependents (no other table FKs into Sale). **No issue.**

### Data Migration Strategy (SQLite → PostgreSQL)

**Phase 2 will NOT migrate production data.** This phase establishes the PostgreSQL foundation. Actual data migration is a deployment operation. However, the strategy must be documented:

#### Step 1: Export from SQLite
```
1. Connect to SQLite DB
2. For each model, SELECT all rows
3. Write to JSON/CSV intermediate format
4. Record row counts per table
```

#### Step 2: Validate FK Integrity
```
1. Check Sale.crewId references exist in Crew
2. Check TikTokSale.crewId references exist in Crew
3. Check Crew.groupId references exist in Group
4. Report any orphaned references
5. Fix or remove orphaned rows before proceeding
```

#### Step 3: Import to PostgreSQL
```
1. Set DATABASE_URL to PostgreSQL
2. Run prisma migrate deploy
3. For each model (respecting FK order):
   a. Admin
   b. Group
   c. Crew (depends on Group)
   d. Sale (depends on Crew — optional)
   e. TikTokSale (depends on Crew — optional)
   f. ActivityLog
4. Insert in batches (500 rows per createMany)
5. Record inserted counts per table
```

#### Step 4: Verify
```
1. Row counts match between source and target
2. Sample 10 random rows per table — compare field values
3. FK integrity check on PostgreSQL (automatic — enforced by DB)
4. Run application smoke test against PostgreSQL
5. Compare dashboard output between SQLite and PostgreSQL
```

---

## 11. Environment/Configuration Changes

### Current `.env`
```
DATABASE_URL=file:/home/z/my-project/db/custom.db
NEXT_AUTH_SECRET=<64-char secret>
```

### Required `.env` for PostgreSQL
```
# PostgreSQL connection (Phase 2)
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>?schema=public

# Connection pool settings (Phase 2 — application-level)
# DATABASE_POOL_SIZE=10          # Prisma connection limit
# DATABASE_POOL_TIMEOUT=30       # Seconds to wait for available connection

# Auth (unchanged)
NEXT_AUTH_SECRET=<64-char secret>
```

### Security Requirements
- ✅ `DATABASE_URL` must come from environment/secrets only
- ✅ Never commit `DATABASE_URL` with credentials
- ✅ Never log `DATABASE_URL` value
- ✅ Never expose raw DB errors to clients (already handled by `handleApiError`)
- ✅ Create `.env.example` with placeholder values

### Prisma Client Configuration Changes

**Current:** `src/lib/db.ts`
```ts
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})
```

**Target (Phase 2):**
```ts
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})
```

No other changes needed — Prisma reads `DATABASE_URL` from env automatically.

---

## 12. Rollback Strategy

### Rollback Scenario: PostgreSQL fails, revert to SQLite

1. **Schema:** Revert `prisma/schema.prisma` `provider` to `"sqlite"` and `url` to `"file:./dev.db"`
2. **Environment:** Restore `DATABASE_URL=file:...` in `.env`
3. **Code:** Revert any `mode: 'insensitive'` additions (they're PostgreSQL-only)
4. **Regenerate:** Run `prisma generate` to rebuild client for SQLite
5. **Database:** Point to existing SQLite file (not modified during PostgreSQL experiment)
6. **Deploy:** Redeploy application with SQLite configuration

### Rollback Verification
1. Application starts successfully
2. Login works
3. Dashboard loads with correct data
4. CRUD operations on all models work

### Rollback Time Estimate
- **< 5 minutes** if only schema/config changes were made
- **< 30 minutes** if application code changes were made (git revert)

---

## 13. Data Integrity Verification Strategy

### Pre-Migration Checks (SQLite side)

```sql
-- 1. Row counts per table
SELECT 'Admin' as tbl, COUNT(*) as cnt FROM Admin
UNION ALL SELECT 'Group', COUNT(*) FROM "Group"
UNION ALL SELECT 'Crew', COUNT(*) FROM Crew
UNION ALL SELECT 'Sale', COUNT(*) FROM Sale
UNION ALL SELECT 'TikTokSale', COUNT(*) FROM TikTokSale
UNION ALL SELECT 'ActivityLog', COUNT(*) FROM ActivityLog;

-- 2. Orphaned FK references
SELECT COUNT(*) as orphaned_sales FROM Sale WHERE "crewId" IS NOT NULL AND "crewId" NOT IN (SELECT id FROM Crew);
SELECT COUNT(*) as orphaned_tiktok FROM TikTokSale WHERE "crewId" IS NOT NULL AND "crewId" NOT IN (SELECT id FROM Crew);
SELECT COUNT(*) as orphaned_crews FROM Crew WHERE "groupId" NOT IN (SELECT id FROM "Group");

-- 3. NULL checks on required fields
SELECT COUNT(*) as null_kodeExtend FROM Sale WHERE "kodeExtend" IS NULL;
SELECT COUNT(*) as null_employeeId FROM Crew WHERE "employeeId" IS NULL;

-- 4. Unique constraint violations
SELECT "username", COUNT(*) FROM Admin GROUP BY "username" HAVING COUNT(*) > 1;
SELECT "employeeId", COUNT(*) FROM Crew GROUP BY "employeeId" HAVING COUNT(*) > 1;
```

### Post-Migration Checks (PostgreSQL side)

1. **Row counts match** — compare with pre-migration counts
2. **FK integrity** — automatic (PostgreSQL enforces FK constraints)
3. **Unique constraints** — automatic (PostgreSQL enforces unique constraints)
4. **Sample data comparison** — compare 10 random rows per table between SQLite export and PostgreSQL
5. **Application-level verification:**
   - Login succeeds
   - Dashboard returns data
   - Claims list loads
   - Crew list loads
   - Group list loads
   - Sale import works
   - Sale export works
   - Data clear + re-import works

---

## 14. Connection/Pooling Requirements

### Current State
- **No pooling.** Prisma connects directly to SQLite file.
- **Singleton pattern** prevents hot-reload connection leaks in dev.
- **No connection limit configured.** Prisma default: `connection_limit = num_physical_cpus * 2 + 1`

### PostgreSQL Target Architecture

```
Application (Next.js)
    ↓
Prisma Client (connection pool built-in)
    ↓
PostgreSQL instance
```

**Phase 2:** Prisma's built-in connection pool is sufficient. **No PgBouncer needed yet.**

### Pool Sizing Strategy

**Formula:** `pool_size = max_connections = (num_app_instances × connections_per_instance) + overhead`

| Deployment | App Instances | Connections/Instance | Overhead | Total Pool |
|-----------|--------------|---------------------|----------|------------|
| Dev (single) | 1 | 5 | 2 | 7 |
| Staging (single) | 1 | 10 | 3 | 13 |
| Production (2 instances) | 2 | 10 | 5 | 25 |
| Production (4 instances) | 4 | 10 | 5 | 45 |

**Configuration via environment:**
```
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=30
```

**Why not PgBouncer in Phase 2:**
- Single or few application instances → Prisma pool sufficient
- PgBouncer adds operational complexity
- PgBouncer needed when: >5 app instances, serverless with high connection churn, or PostgreSQL `max_connections` < 50

**Phase 3 trigger for PgBouncer:** When `total_app_connections > 0.5 × postgresql_max_connections`

### Connection Lifecycle

```ts
// Production: graceful shutdown
process.on('SIGTERM', async () => {
  await db.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await db.$disconnect()
  process.exit(0)
})
```

**Current state:** `seed.ts` calls `db.$disconnect()` in `finally`. Application routes do not — they rely on Next.js runtime lifecycle. **Add graceful shutdown handlers in Phase 2.**

### Timeout Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `connection_limit` | 10 (default per instance) | Sufficient for current load |
| `pool_timeout` | 30s | Wait up to 30s for available connection |
| `statement_timeout` | 30s (PostgreSQL-level) | Prevent runaway queries |
| `idle_timeout` | 600s (Prisma default) | Close idle connections after 10 min |

---

## 15. Health-Check Requirements

### Design: `/api/health` Endpoint

**Purpose:** Distinguish APPLICATION UP from DATABASE HEALTHY.

```ts
// GET /api/health — No auth required
// Returns: { status: "ok" | "degraded" | "unhealthy", checks: {...}, timestamp }

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'unhealthy'
  checks: {
    database: { status: 'ok' | 'error'; latencyMs: number; message?: string }
  }
  timestamp: string
}
```

**Implementation:**
```ts
// 1. Check database connectivity
const start = Date.now()
await db.$queryRaw`SELECT 1`
const latencyMs = Date.now() - start

// 2. Status logic
// - latencyMs < 100 → "ok"
// - latencyMs < 1000 → "degraded"
// - query fails or latencyMs >= 1000 → "unhealthy"
```

**Security:**
- ✅ No authentication required (health checks must work from load balancers)
- ✅ No credentials exposed
- ✅ No database details exposed (host, port, name)
- ✅ No table names or row counts exposed
- ✅ Generic error message on failure: `"Database connection failed"`

**HTTP Status Codes:**
- `200` — status is `ok` or `degraded`
- `503` — status is `unhealthy`

**Caching:**
- Health check should NOT be cached
- Set `Cache-Control: no-store` header

---

## 16. Risks/Blockers

### HIGH Risk

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | **Orphaned FK references in SQLite data** | PostgreSQL will reject data import. Application may have been relying on SQLite's lax FK enforcement. | Pre-migration FK integrity check (Section 13). Fix or remove orphaned rows before migration. |
| R2 | **Race conditions surface in PostgreSQL** | Concurrent writes no longer serialized by file lock. Claim/import operations may produce duplicate or incorrect data. | Document all race conditions (done below). Fix critical ones (admin setup TOCTOU) in Phase 2. Others deferred to Phase 3 with explicit documentation. |
| R3 | **`contains` filter case-sensitivity change** | Search results differ between SQLite and PostgreSQL. Barcode lookup may fail for mixed-case `kodeExtend` values. | Add `mode: 'insensitive'` to all `contains` filters when PostgreSQL provider is active. |

### MEDIUM Risk

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R4 | **Float precision differences** | PostgreSQL `DOUBLE PRECISION` may produce slightly different rounding for `settle`, `hjp`, `diskon` calculations. | Compare sample calculations between providers. Use `Decimal` in Phase 3 if discrepancy found. |
| R5 | **Raw SQL future fragility** | `$queryRaw` queries bypass Prisma's type system. Schema changes could break them silently. | Replace with Prisma `groupBy` where possible. Document remaining raw SQL. |
| R6 | **Connection exhaustion under load** | Multiple app instances + no PgBouncer could exceed PostgreSQL `max_connections`. | Monitor connection counts. Add PgBouncer in Phase 3 when instances > 3. |

### LOW Risk

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R7 | **Seed script `deleteMany` on Sale** | Seed deletes all sales before re-seeding. If run accidentally on production, data loss. | Seed only runs via explicit `bun run db:seed`. Not called at app startup. |
| R8 | **Migration history incompatibility** | Existing SQLite migration cannot be applied to PostgreSQL. | Start fresh migration history for PostgreSQL. |
| R9 | **`tanggal` string vs Date type** | Dates stored as strings lose PostgreSQL-native date functions (EXTRACT, date_trunc, etc.). | Convert `tanggal` to `DateTime` type in Phase 3. Current string format is safe. |

### Blockers

**None identified.** All risks have mitigations. No technical blocker prevents PostgreSQL migration.

---

## Appendix A: Concurrency/Race Condition Catalog

### Operations at Risk

| # | Operation | Route | Risk Level | Current Behavior | Required Fix | Phase |
|---|-----------|-------|------------|-----------------|-------------|-------|
| 1 | **Admin setup** | `auth/setup/route.ts` L24-65 | **HIGH** | `count()` → check → `create()`. Two concurrent valid SETUP_TOKEN requests can both pass count=0 check and create duplicate admins. | Wrap in `$transaction` with `SERIALIZABLE` isolation, OR rely on `username` unique constraint + catch P2002. | **Phase 2** |
| 2 | **Unclaim (single)** | `claims/unclaim/route.ts` L32-56 | **HIGH** | `findMany()` → filter → `updateMany()`. Between read and write, another request could re-claim the sale. The `updateMany` would wipe the new claim. | Replace with atomic `updateMany` using `WHERE crewId: { not: null }` (same pattern as `bulk-unclaim`). | Phase 3 |
| 3 | **Bulk edit** | `claims/bulk-edit/route.ts` L71-104 | **HIGH** | `count()` for claimedAt decision → `updateMany()` without crewId guard. Stale count + no guard = overwrite concurrent claims. | Add `WHERE crewId: null` guard when setting crewId. Use interactive transaction. | Phase 3 |
| 4 | **PATCH single claim** | `claims/route.ts` L585-633 | **HIGH** | `findUnique()` → check `!sale.crewId` → `update()`. Stale read between check and write. | Use conditional update with `WHERE` guard, or interactive transaction. | Phase 3 |
| 5 | **Claims import** | `claims/route.ts` L156-237 | **MEDIUM** | `count()` per dedup key → `createMany()`. Concurrent imports can create duplicate rows. | Add unique composite index on `(idPenjualan, tanggal, kodeExtend)`. Use `ON CONFLICT DO NOTHING` or upsert. | Phase 3 |
| 6 | **Data import** | `data/import/route.ts` L100-234 | **HIGH** | Non-transactional `deleteMany` cascade. `findFirst` + `create` loops without transaction. | Wrap delete cascade in `$transaction`. Use `upsert` instead of findFirst+create. | Phase 3 |
| 7 | **TikTok import** | `tiktok-sales/import/route.ts` L165-259 | **MEDIUM** | Pre-fetch dedup set → `createMany()`. Concurrent imports create duplicates. | Add unique composite index on `(tanggal, idOrder)`. | Phase 3 |
| 8 | **Crew batch import** | `crews/batch-import/route.ts` L101-226 | **MEDIUM** | Default group TOCTOU + stale crew dedup set. | Use `upsert` for default group and crews. | Phase 3 |

### Operations SAFE (No Race Condition)

| # | Operation | Route | Why Safe |
|---|-----------|-------|----------|
| 1 | **Bulk claim** | `claims/route.ts` L443-458 | `updateMany WHERE crewId = null` — atomic compare-and-swap |
| 2 | **Bulk unclaim** | `claims/bulk-unclaim/route.ts` L21-30 | `updateMany WHERE crewId != null` — atomic conditional |
| 3 | **Clear-all** | `data/clear-all/route.ts` L27-37 | Uses `$transaction` for delete batch |
| 4 | **All reads** | dashboard, search, export, etc. | Read-only queries have no write race |

### Phase 2 Minimum Fix

Only **#1 (Admin setup)** is fixed in Phase 2 because:
- It's a security-critical path (unauthenticated admin creation)
- The fix is simple and low-risk (unique constraint already exists + catch P2002)
- It prevents a real attack vector (concurrent SETUP_TOKEN requests)

All other race conditions are **documented but deferred to Phase 3** because:
- They require transaction isolation changes that need careful testing
- They're mitigated by SQLite's single-writer model in the current deployment
- Fixing them without proper load testing could introduce new bugs

---

## Appendix B: Phase 3 Requirements (Not Implemented This Phase)

### PostgreSQL HA
- Primary + standby replica
- Automatic failover (Patroni or cloud-managed)
- Connection endpoint that routes to healthy primary
- Health monitoring

### Backup/PITR
- Continuous WAL archiving
- Point-in-time recovery capability
- Daily base backup + WAL segments
- Restore testing procedure (monthly)

### Read Replicas
- Async replica for dashboard/reporting queries
- Prisma read-from-replica configuration
- Replica lag monitoring

### PgBouncer
- Transaction-mode pooling
- Connection routing (primary vs replica)
- Admin console for monitoring
- Deploy when: `total_app_connections > 0.5 × postgresql_max_connections`

### Data Type Upgrades
- `Float` → `Decimal` for financial fields (settle, hjp, netto, diskon, revenue, monthlyTarget, etc.)
- `String tanggal` → `DateTime tanggal` with proper date indexing
- `String` constraints with `@db.VarChar(n)` for bounded fields

### Concurrency Fixes
- Interactive transactions for all read-then-write patterns
- Unique composite indexes for dedup
- `ON CONFLICT` / upsert patterns
- Serializable isolation for critical operations

---

## Appendix C: Raw SQL Inventory

| File | Line | Query Purpose | PostgreSQL-Compatible? |
|------|------|---------------|----------------------|
| `dashboard/route.ts` | 198 | Today struk count by crew | ✅ Yes |
| `dashboard/route.ts` | 204 | Week struk count by crew | ✅ Yes |
| `dashboard/route.ts` | 210 | Month struk count by crew | ✅ Yes |
| `dashboard/route.ts` | 216 | All-time struk count by crew | ✅ Yes |
| `dashboard/group-detail/route.ts` | 175 | Period struk count by crew (parameterized) | ✅ Yes |

All raw SQL uses:
- Double-quoted identifiers (PostgreSQL standard)
- `Prisma.join()` for safe array interpolation
- `Prisma.sql` tagged templates for safe value interpolation
- `COUNT(DISTINCT ...)` — standard SQL

**No raw SQL modification needed for PostgreSQL migration.**

---

## Appendix D: `contains` Filter Inventory

All Prisma `contains` filters that may need `mode: 'insensitive'` for PostgreSQL:

| File | Line | Field | Current | Fix for PostgreSQL |
|------|------|-------|---------|-------------------|
| `claims/search/route.ts` | 15 | `kodeExtend` | `{ contains: search.toUpperCase() }` | `{ contains: search, mode: 'insensitive' }` |
| `claims/search/route.ts` | 16 | `idPenjualan` | `{ contains: search }` | `{ contains: search, mode: 'insensitive' }` |
| `claims/search/route.ts` | 17 | `brand` | `{ contains: search }` | `{ contains: search, mode: 'insensitive' }` |
| `claims/search/route.ts` | 18 | `dept` | `{ contains: search }` | `{ contains: search, mode: 'insensitive' }` |
| `claims/search/route.ts` | 19 | `modul` | `{ contains: search }` | `{ contains: search, mode: 'insensitive' }` |

**Note:** `mode: 'insensitive'` is only valid for PostgreSQL provider. Must conditionally apply or verify provider at runtime. Simplest approach: since this is a PostgreSQL migration, always use `mode: 'insensitive'` after switching providers.

---

**PHASE 2 PLANNING STATUS: READY FOR GPT VERIFICATION**
