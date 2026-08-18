// ─────────────────────────────────────────────────────────
// PostgreSQL-backed Atomic Fixed-Window Rate Limiter
//
// Phase 4: Replaces in-memory rate limiter.
// - Atomic fixed-window counter via PostgreSQL UPSERT
// - Fail policy per endpoint category:
//     SECURITY_SENSITIVE → FAIL-CLOSED (reject with static emergency limit)
//     MUTATION           → SAFE EMERGENCY LIMIT (reduced static limit)
//     LOW_RISK_READ      → FAIL-OPEN (allow, log warning)
//     HEALTH_PUBLIC      → FAIL-OPEN (no rate limit at all)
//
// This is a FIXED-WINDOW counter, not a sliding window.
// Simpler, correct, and sufficient for current scale.
// Switch to sliding window only if testing proves boundary-burst is a problem.
// ─────────────────────────────────────────────────────────

import { db } from './db'

export interface RateLimitConfig {
  maxRequests: number    // Max requests per window
  windowMs: number       // Time window in milliseconds
  failPolicy: FailPolicy // What to do when DB is unreachable
}

// ─────────────────────────────────────────────────────────
// Fail Policy Classification
// ─────────────────────────────────────────────────────────
export type FailPolicy = 'security_sensitive' | 'mutation' | 'low_risk_read' | 'health_public'

// Static emergency limits when DB is unreachable
const EMERGENCY_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  security_sensitive: { maxRequests: 3, windowMs: 15 * 60 * 1000 },  // 3 per 15 min
  mutation: { maxRequests: 1, windowMs: 60 * 1000 },                  // 1 per min
  low_risk_read: { maxRequests: Infinity, windowMs: Infinity },        // unlimited
  health_public: { maxRequests: Infinity, windowMs: Infinity },        // unlimited
}

// In-memory fallback store for emergency limits (used only when DB is down)
const emergencyStore = new Map<string, { count: number; resetTime: number }>()

// Predefined rate limit configs with fail policy classification
export const RATE_LIMITS = {
  LOGIN:           { maxRequests: 5,  windowMs: 15 * 60 * 1000, failPolicy: 'security_sensitive' as FailPolicy },
  PASSWORD_CHANGE: { maxRequests: 3,  windowMs: 15 * 60 * 1000, failPolicy: 'security_sensitive' as FailPolicy },
  SETUP:           { maxRequests: 3,  windowMs: 60 * 60 * 1000, failPolicy: 'security_sensitive' as FailPolicy },
  API_STANDARD:    { maxRequests: 60, windowMs: 60 * 1000,       failPolicy: 'low_risk_read' as FailPolicy },
  IMPORT:          { maxRequests: 3,  windowMs: 60 * 1000,       failPolicy: 'mutation' as FailPolicy },
  EXPORT:          { maxRequests: 10, windowMs: 60 * 1000,       failPolicy: 'low_risk_read' as FailPolicy },
} as const

// ─────────────────────────────────────────────────────────
// Main rate limit function (async — must be awaited)
// ─────────────────────────────────────────────────────────
export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // Health/public endpoints: no rate limiting at all
  if (config.failPolicy === 'health_public') {
    return { allowed: true, remaining: Infinity, resetTime: Date.now() + config.windowMs }
  }

  const now = new Date()

  try {
    // ── PostgreSQL atomic fixed-window counter ──
    // Try to increment existing entry within current window
    const result = await db.$executeRaw`
      UPDATE "RateLimitEntry"
      SET "count" = "count" + 1
      WHERE "key" = ${key}
        AND "windowEnd" > ${now}
    `

    if (result > 0) {
      // Entry existed and was within window — check if over limit
      const entry = await db.rateLimitEntry.findUnique({ where: { key } })
      if (!entry) {
        // Should not happen after successful update, but handle gracefully
        return { allowed: true, remaining: config.maxRequests - 1, resetTime: Date.now() + config.windowMs }
      }

      const remaining = Math.max(0, config.maxRequests - entry.count)
      const allowed = entry.count <= config.maxRequests
      return { allowed, remaining, resetTime: entry.windowEnd.getTime() }
    }

    // No existing entry in current window — create new window
    const windowEnd = new Date(now.getTime() + config.windowMs)
    try {
      await db.rateLimitEntry.create({
        data: {
          key,
          count: 1,
          windowStart: now,
          windowEnd,
        },
      })
    } catch (createError: unknown) {
      // P2002: Unique constraint violation — concurrent request created entry
      // Try increment again (it's now in the current window since we just set it)
      if (isP2002(createError)) {
        await db.$executeRaw`
          UPDATE "RateLimitEntry"
          SET "count" = "count" + 1
          WHERE "key" = ${key}
            AND "windowEnd" > ${now}
        `
        const entry = await db.rateLimitEntry.findUnique({ where: { key } })
        if (entry) {
          const remaining = Math.max(0, config.maxRequests - entry.count)
          const allowed = entry.count <= config.maxRequests
          return { allowed, remaining, resetTime: entry.windowEnd.getTime() }
        }
      } else {
        throw createError
      }
    }

    return { allowed: true, remaining: config.maxRequests - 1, resetTime: windowEnd.getTime() }
  } catch (dbError) {
    // ── DB unreachable — apply fail policy ──
    return applyFailPolicy(key, config, dbError)
  }
}

// ─────────────────────────────────────────────────────────
// Fail Policy Implementation
// ─────────────────────────────────────────────────────────
function applyFailPolicy(
  key: string,
  config: RateLimitConfig,
  _error: unknown
): { allowed: boolean; remaining: number; resetTime: number } {
  const policy = config.failPolicy

  // LOW_RISK_READ: FAIL-OPEN — allow, log warning
  if (policy === 'low_risk_read') {
    console.warn(`[RateLimit] DB unavailable, fail-open for key: ${key}`)
    return { allowed: true, remaining: config.maxRequests, resetTime: Date.now() + config.windowMs }
  }

  // SECURITY_SENSITIVE and MUTATION: use in-memory emergency limit
  const emergency = EMERGENCY_LIMITS[policy]
  if (!emergency || emergency.maxRequests === Infinity) {
    // Should not reach here, but fail-open as safety net
    console.warn(`[RateLimit] DB unavailable, unexpected policy: ${policy} for key: ${key}`)
    return { allowed: true, remaining: config.maxRequests, resetTime: Date.now() + config.windowMs }
  }

  const now = Date.now()
  let entry = emergencyStore.get(key)

  // Reset expired window
  if (entry && now > entry.resetTime) {
    entry = undefined
  }

  if (!entry) {
    emergencyStore.set(key, { count: 1, resetTime: now + emergency.windowMs })
    return { allowed: true, remaining: emergency.maxRequests - 1, resetTime: now + emergency.windowMs }
  }

  if (entry.count >= emergency.maxRequests) {
    const policyLabel = policy === 'security_sensitive' ? 'FAIL-CLOSED' : 'EMERGENCY-LIMIT'
    console.warn(`[RateLimit] DB unavailable, ${policyLabel} rejected for key: ${key} (count: ${entry.count}/${emergency.maxRequests})`)
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }

  entry.count++
  const remaining = emergency.maxRequests - entry.count
  return { allowed: true, remaining, resetTime: entry.resetTime }
}

// ─────────────────────────────────────────────────────────
// P2002 detection helper
// ─────────────────────────────────────────────────────────
function isP2002(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code === 'P2002'
  }
  return false
}

// ─────────────────────────────────────────────────────────
// Cleanup expired entries (runs periodically)
// ─────────────────────────────────────────────────────────
let _cleanupStarted = false

function startCleanup() {
  if (_cleanupStarted) return
  _cleanupStarted = true

  // Clean up expired rate limit entries every 60 seconds
  setInterval(async () => {
    try {
      const now = new Date()
      await db.rateLimitEntry.deleteMany({
        where: { windowEnd: { lt: now } },
      })
    } catch {
      // Non-critical — cleanup will retry next interval
    }

    // Also clean up expired emergency store entries
    const nowMs = Date.now()
    for (const [key, entry] of emergencyStore) {
      if (nowMs > entry.resetTime) emergencyStore.delete(key)
    }
  }, 60 * 1000)
}

// Start cleanup on first import
if (typeof process !== 'undefined') {
  startCleanup()
}

// ─────────────────────────────────────────────────────────
// Helper functions (same API as before)
// ─────────────────────────────────────────────────────────

// Helper to get client identifier from request
export function getClientId(request: Request): string {
  // Use X-Forwarded-For (from Caddy) or fallback to connection info
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  return ip
}

// Helper to create rate limit response headers
export function rateLimitHeaders(remaining: number, resetTime: number) {
  return {
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
  }
}
