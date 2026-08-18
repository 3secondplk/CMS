import { NextResponse } from 'next/server'
import { isShuttingDown } from '@/lib/db'

// ─────────────────────────────────────────────────────────
// GET /api/health/live — Liveness probe
//
// Definition: Application process is alive.
// Returns 200 if the process can respond to HTTP.
// Returns 503 only if actively shutting down (draining).
//
// This probe does NOT check database connectivity.
// It is lightweight and should always respond quickly.
//
// Use case: Kubernetes liveness probe / load balancer keep-alive.
// If this fails, the process should be restarted.
// ─────────────────────────────────────────────────────────

export async function GET() {
  const timestamp = new Date().toISOString()

  if (isShuttingDown()) {
    return NextResponse.json(
      {
        status: 'draining',
        timestamp,
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }

  return NextResponse.json(
    {
      status: 'ok',
      timestamp,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
