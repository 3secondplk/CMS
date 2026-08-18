// Phase 5: pg_trgm + GIN index setup and verification
// Call ensurePgTrgmIndexes() at app startup to create indexes if missing.
// Safe to call multiple times (all statements are IF NOT EXISTS).

import { db } from '@/lib/db'

let _trgmVerified = false

/**
 * Ensure pg_trgm extension and GIN trigram indexes exist.
 * Called once at app startup. All statements are idempotent (IF NOT EXISTS).
 * Returns true if indexes are available, false if pg_trgm extension is unavailable
 * (e.g., restricted cloud DB without superuser access).
 */
export async function ensurePgTrgmIndexes(): Promise<boolean> {
  if (_trgmVerified) return true

  try {
    // Step 1: Create pg_trgm extension (requires superuser on some hosted PG)
    await db.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`)

    // Step 2: Create GIN trigram indexes (idempotent)
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Sale_brand_trgm" ON "Sale" USING GIN (brand gin_trgm_ops)`
    )
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Sale_dept_trgm" ON "Sale" USING GIN (dept gin_trgm_ops)`
    )
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Sale_modul_trgm" ON "Sale" USING GIN (modul gin_trgm_ops)`
    )

    // Step 3: Analyze to update planner stats
    await db.$executeRawUnsafe(`ANALYZE "Sale"`)

    _trgmVerified = true
    console.log('[Phase 5] pg_trgm + GIN trigram indexes verified')
    return true
  } catch (error) {
    // pg_trgm may not be available on restricted cloud DBs
    // This is non-fatal — search still works via Seq Scan, just slower
    console.warn('[Phase 5] pg_trgm unavailable, ILIKE search will use Seq Scan:', 
      error instanceof Error ? error.message : String(error))
    _trgmVerified = false
    return false
  }
}

/**
 * Check if pg_trgm indexes are available (without creating them).
 * Used by health/debug endpoints.
 */
export async function isPgTrgmAvailable(): Promise<boolean> {
  try {
    const result = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM pg_extension WHERE extname = 'pg_trgm'
    `
    return result[0].count > 0n
  } catch {
    return false
  }
}
