# Phase 5 — Performance Optimization Plan

Dataset: 50,000 Sale | 5,000 TikTokSale | 1,000 Crew | 10 Group
Engine: PostgreSQL 18 (PGlite WASM baseline; production: PG 12+)

## 1. Claims Search ILIKE (CRITICAL)

### Current query
```sql
SELECT * FROM "Sale"
  WHERE "kodeExtend" ILIKE '%x%' OR "brand" ILIKE '%x%'
     OR "dept" ILIKE '%x%' OR "modul" ILIKE '%x%'
  ORDER BY "createdAt" DESC LIMIT 20
```
Routes: claims/search, claims GET, management/report

### EXPLAIN ANALYZE baseline
| Variant | Plan | Actual rows | Time | Index |
|---------|------|-------------|------|-------|
| Single brand ILIKE | Seq Scan | 5,000 | **55ms** | NONE |
| Multi-OR ILIKE | Seq Scan | 10,800 | **118ms** | NONE |
| Crew.name ILIKE JOIN | Hash Join→Seq Scan | 50,000 | **92ms** | NONE |

45,000–39,200 rows removed by filter. B-tree **cannot** help: `ILIKE '%x%'` has leading wildcard.

### Candidate: pg_trgm + GIN index
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX Sale_brand_trgm ON "Sale" USING GIN (brand gin_trgm_ops);
CREATE INDEX Sale_dept_trgm  ON "Sale" USING GIN (dept  gin_trgm_ops);
CREATE INDEX Sale_modul_trgm ON "Sale" USING GIN (modul gin_trgm_ops);
```
Mechanism: GIN stores 3-char trigrams; `ILIKE '%nike%'` → {nik,ike} → index seek narrows 50k→5k rows.

**Expected benefit**: Q1: 55ms→~5–8ms (85%↓). Q2: 118ms→~15–25ms (bitmap OR of 4 GIN indexes).
**Write/storage**: +9–15 MB disk, ~15–20% slower INSERT (trigram extraction).
**Availability**: PG 12+ contrib. Neon/Supabase/Railway: pre-enabled. Requires `CREATE EXTENSION` on bare PG.
**Acceptance**: Q1 <10ms, Q2 <30ms at 50k rows; pg_trgm must be available on deployment target.

---

## 2. Dashboard Aggregation / groupBy

### Current query
```sql
SELECT "crewId", SUM(settle), SUM(qty), COUNT(*)
  FROM "Sale" WHERE "crewId" IN (...) AND "tanggal" LIKE '2026-03-%'
  GROUP BY "crewId"
```
Routes: dashboard, dashboard/group-detail, crews

### EXPLAIN ANALYZE baseline
| Variant | Plan | Rows | Time | Index |
|---------|------|------|------|-------|
| groupBy crewId | BitmapAnd(crewId+tanggal) | 33 | **1.5ms** | crewId_idx + tanggal_idx |
| Aggregate totals | Bitmap Index Scan | 4,167 | **8.2ms** | tanggal_idx |

**Already efficient.** BitmapAnd combines two single-column indexes.

### Candidate: Composite (tanggal, crewId)
```sql
CREATE INDEX Sale_tanggal_crewId_idx ON "Sale"("tanggal","crewId");
```
**Expected benefit**: 1.5ms→~0.5ms (single index scan vs BitmapAnd merge).
**Write/storage**: +2–3 MB, marginal write cost. Low ROI given already-fast baseline.
**Acceptance**: <2ms (current baseline passes); composite only if latency >50ms at 200k+ rows.

---

## 3. DISTINCT Transaction Count

### Current queries
```sql
SELECT "crewId", COUNT(DISTINCT "idPenjualan") FROM "Sale"
  WHERE "crewId" IN (...) AND "idPenjualan" IS NOT NULL AND "tanggal" LIKE '2026-03-%'
  GROUP BY "crewId"
SELECT DISTINCT program FROM "Sale" WHERE program IS NOT NULL ORDER BY program
```

### EXPLAIN ANALYZE baseline
| Variant | Plan | Rows | Time | Index |
|---------|------|------|------|-------|
| COUNT(DISTINCT) | BitmapAnd(crewId+tanggal) | 33 | **0.95ms** | crewId_idx + tanggal_idx |
| DISTINCT program | Bitmap Index Scan→HashAggregate | 5 | **20.9ms** | program_idx |

Already fast. No action needed.

---

## 4. Export/Import

### EXPLAIN ANALYZE baseline
| Query | Plan | Rows | Time | Issue |
|-------|------|------|------|-------|
| Export findMany+JOIN | Seq Scan+Sort(external merge) | 50,000 | **189ms** | Disk spill 9.6MB |
| TikTok import dedup | Seq Scan | 5,000 | **2.6ms** | Full scan (not bottleneck) |

### Candidate: Increase work_mem (session-scoped)
`SET LOCAL work_mem = '64MB'` inside transaction. Eliminates external merge sort.
**Acceptance**: Export <200ms at 50k rows (current: 189ms borderline); <500ms at 200k rows.

---

## Summary: Action Priority

| # | Optimization | Impact | Cost | Priority |
|---|-------------|--------|------|----------|
| 1 | pg_trgm + GIN on brand/dept/modul | 85% latency↓ on search | 15MB + 15% write | **HIGH** |
| 2 | Increase work_mem for export | Eliminate disk spill | 64MB RAM | **MEDIUM** |
| 3 | Composite (tanggal, crewId) | 67% groupBy gain | 3MB + marginal write | **LOW** |
| 4 | Composite (crewId, idPenjualan, tanggal) | 26% DISTINCT gain | 5MB + write cost | **LOW** |

No implementation this phase. All require deployment-target EXPLAIN ANALYZE verification.

---

PHASE 5 STATUS: READY FOR GPT VERIFICATION
