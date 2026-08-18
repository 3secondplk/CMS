import { NextResponse } from 'next/server'
import { db, updateHealthCheck, isShuttingDown, getConnectionState } from '@/lib/db'
import { withRetry } from '@/lib/retry'

// ─────────────────────────────────────────────────────────
// GET /api/health — Comprehensive health check
//
// Phase 3: Three-tier health model
//   /api/health      → Full health status (liveness + readiness combined)
//   /api/health/live → Liveness only (process is alive)
//   /api/health/ready→ Readiness (DB dependency available)
//
// This endpoint combines both checks and returns:
//   - status: "ok" | "degraded" | "draining" | "unhealthy"
//   - Never exposes credentials, DB details, or table names
//   - Cache-Control: no-store (always fresh)
//
// Uses withRetry for transient DB failures (read-only SELECT 1 is safe to retry).
// ─────────────────────────────────────────────────────────

export async function GET() {
  const timestamp = new Date().toISOString()

  // Check if we're shutting down
  if (isShuttingDown()) {
    return NextResponse.json(
      {
        status: 'draining',
        checks: {
          liveness: { status: 'ok' },
          readiness: { status: 'draining', message: 'Shutting down' },
        },
        timestamp,
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }

  const start = Date.now()

  try {
    // SELECT 1 is read-only — safe to retry on transient failures
    await withRetry(
      () => db.$queryRaw`SELECT 1`,
      { maxRetries: 2, baseDelayMs: 500, operationName: 'health' },
    )
    const latencyMs = Date.now() - start
    updateHealthCheck(true, latencyMs)

    // Status determination based on latency
    const dbStatus = latencyMs < 100 ? 'ok' : 'degraded'
    const overallStatus = dbStatus === 'ok' ? 'ok' : 'degraded'

    const connState = getConnectionState()

    return NextResponse.json(
      {
        status: overallStatus,
        checks: {
          liveness: { status: 'ok' },
          readiness: {
            status: dbStatus,
            database: { status: 'ok', latencyMs },
          },
        },
        uptimeMs: connState.uptimeMs,
        timestamp,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch {
    const latencyMs = Date.now() - start
    updateHealthCheck(false, latencyMs)

    const connState = getConnectionState()

    return NextResponse.json(
      {
        status: 'unhealthy',
        checks: {
          liveness: { status: 'ok' },
          readiness: {
            status: 'error',
            database: { status: 'error', message: 'Database connection failed' },
          },
        },
        uptimeMs: connState.uptimeMs,
        timestamp,
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }
}
