-- Phase 5: pg_trgm + GIN trigram indexes for ILIKE search optimization
--
-- Problem: Claims search uses ILIKE '%pattern%' on brand, dept, modul columns.
-- B-tree indexes CANNOT accelerate leading-wildcard ILIKE (proven by benchmark).
-- pg_trgm GIN indexes store all 3-char trigrams, enabling index-accelerated ILIKE.
--
-- Measured baseline (50k Sale rows, PGlite PG18 WASM):
--   Single ILIKE: ~39-43ms Seq Scan (B-tree useless)
--   Multi-OR ILIKE: ~118ms Seq Scan
--
-- Expected with GIN: ~5-10ms single, ~15-25ms multi-OR (85% reduction)
-- Write cost: ~15-20% slower INSERT (trigram extraction + GIN tree update)
-- Storage: ~3-5 MB per GIN index (9-15 MB total for 3 indexes on 50k rows)

-- Step 1: Enable pg_trgm extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Create GIN trigram indexes on ILIKE-searched columns
-- These replace the need for B-tree indexes on these columns for search.
-- The existing B-tree indexes on other columns (tanggal, kodeExtend, crewId, etc.) remain.

-- GIN trigram index on Sale.brand (searched via ILIKE in claims/search, claims, management/report)
CREATE INDEX IF NOT EXISTS "Sale_brand_trgm" ON "Sale" USING GIN (brand gin_trgm_ops);

-- GIN trigram index on Sale.dept (searched via ILIKE in claims/search, claims, management/report)
CREATE INDEX IF NOT EXISTS "Sale_dept_trgm" ON "Sale" USING GIN (dept gin_trgm_ops);

-- GIN trigram index on Sale.modul (searched via ILIKE in claims/search, claims, management/report)
CREATE INDEX IF NOT EXISTS "Sale_modul_trgm" ON "Sale" USING GIN (modul gin_trgm_ops);
