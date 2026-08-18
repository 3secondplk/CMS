import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────────────────
// Prisma Client singleton with PostgreSQL connection management
//
// Phase 3: Connection resilience
//   - Pool sizing via DATABASE_URL params (connection_limit, pool_timeout)
//   - Connection timeout via connect_timeout param
//   - Graceful shutdown with drain period
//   - Transient failure detection
//   - Connection exhaustion guard
//
// Pool sizing formula:
//   total_connections = (app_instances × connection_limit) + overhead
//   where overhead = 5 (for migrations, admin connections)
//
//   PostgreSQL max_connections (default: 100)
//   Recommended: total_connections ≤ 80% of max_connections
//
//   Examples:
//     Dev:     1 instance × 5  + 5 = 10  (≤80% of 100 ✓)
//     Staging: 1 instance × 10 + 5 = 15  (≤80% of 100 ✓)
//     Prod(2): 2 instance × 10 + 5 = 25  (≤80% of 100 ✓)
//     Prod(4): 4 instance × 10 + 5 = 45  (≤80% of 100 ✓)
//     Prod(8): 8 instance × 10 + 5 = 85  (>80%! Need PgBouncer or higher max_connections)
//
// Current .env: connection_limit=10, pool_timeout=30
// ─────────────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ─────────────────────────────────────────────────────────
// Connection state tracking for health checks
// ─────────────────────────────────────────────────────────
let _lastHealthCheck: { ok: boolean; latencyMs: number; timestamp: number } | null = null
let _startupTime = Date.now()

export function getConnectionState() {
  return {
    uptimeMs: Date.now() - _startupTime,
    lastHealthCheck: _lastHealthCheck,
  }
}

export function updateHealthCheck(ok: boolean, latencyMs: number) {
  _lastHealthCheck = { ok, latencyMs, timestamp: Date.now() }
}

// ─────────────────────────────────────────────────────────
// Transient error detection
// Identifies database errors that are safe to retry (read-only)
// ─────────────────────────────────────────────────────────
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  // Prisma connection timeout (P1001)
  if (error.message.includes('P1001')) return true
  // Prisma connection error (P1002) — can't reach DB
  if (error.message.includes('P1002')) return true
  // Prisma pool timeout (P1008) — all connections busy
  if (error.message.includes('P1008')) return true
  // PostgreSQL "connection refused"
  if (error.message.includes('ECONNREFUSED')) return true
  // PostgreSQL "server closed the connection unexpectedly"
  if (error.message.includes('server closed the connection')) return true
  // PostgreSQL "sorry, too many clients already"
  if (error.message.includes('too many clients')) return true
  // PostgreSQL "the database system is starting up"
  if (error.message.includes('database system is starting up')) return true
  // PostgreSQL "the database system is in recovery mode"
  if (error.message.includes('database system is in recovery mode')) return true
  // Timeout errors
  if (error.message.includes('Query timed out')) return true
  if (error.name === 'TimeoutError') return true

  return false
}

// ─────────────────────────────────────────────────────────
// Graceful shutdown — drain connections before exit
//
// Phase 3 enhancement:
//   1. Sets a shutting-down flag so health checks report "draining"
//   2. Allows in-flight requests to complete (drain period)
//   3. Disconnects Prisma
//   4. Exits with code 0
//
// Drain period: 5 seconds (configurable via SHUTDOWN_DRAIN_MS env)
// ─────────────────────────────────────────────────────────
let _isShuttingDown = false

export function isShuttingDown(): boolean {
  return _isShuttingDown
}

if (typeof process !== 'undefined') {
  const gracefulShutdown = async (signal: string) => {
    if (_isShuttingDown) return // Prevent double-shutdown
    _isShuttingDown = true

    console.log(`Received ${signal}, draining connections...`)
    const drainMs = parseInt(process.env.SHUTDOWN_DRAIN_MS || '5000', 10)

    // Allow in-flight requests to complete
    await new Promise(resolve => setTimeout(resolve, Math.min(drainMs, 10000)))

    console.log('Disconnecting database...')
    try {
      await db.$disconnect()
      console.log('Database disconnected.')
    } catch (e) {
      console.error('Error disconnecting database:', e)
    }

    process.exit(0)
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
}
