import { NextResponse } from 'next/server'
import { db, updateHealthCheck, isShuttingDown } from '@/lib/db'
import { withRetry } from '@/lib/retry'

// ─────────────────────────────────────────────────────────
// GET /api/health/ready — Readiness probe
//
// Definition: Application can serve requests AND required
// database dependency is available.
//
// Returns 200 if DB is reachable (SELECT 1 succeeds).
// Returns 503 if DB is unreachable or app is draining.
//
// Does NOT expose credentials or internal database details.
// Only reports: status, latencyMs, and generic error message.
//
// Uses withRetry for transient DB failures (read-only SELECT 1 is safe to retry).
//
// Use case: Kubernetes readiness probe / traffic routing.
// If this fails, traffic should be routed away from this instance.
// ─────────────────────────────────────────────────────────

export async function GET() {
  const timestamp = new Date().toISOString()

  if (isShuttingDown()) {
    return NextResponse.json(
      {
        status: 'draining',
        message: 'Shutting down',
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
      { maxRetries: 2, baseDelayMs: 500, operationName: 'health.ready' },
    )
    const latencyMs = Date.now() - start
    updateHealthCheck(true, latencyMs)

    const status = latencyMs < 500 ? 'ok' : 'degraded'

    return NextResponse.json(
      {
        status,
        database: { status: 'ok', latencyMs },
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

    return NextResponse.json(
      {
        status: 'error',
        database: { status: 'error', message: 'Database connection failed' },
        timestamp,
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }
}
