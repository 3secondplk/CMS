// ─────────────────────────────────────────────────────────
// Retry utility for transient database failures
//
// CRITICAL: Retries are ONLY safe for idempotent read operations.
// DO NOT retry mutations unless idempotency is guaranteed.
//
// Safe to retry (read-only / idempotent):
//   - findMany, findFirst, findUnique, count, aggregate, groupBy
//   - Health checks ($queryRaw SELECT)
//   - Read-only dashboard queries
//
// NOT safe to retry (mutations / side effects):
//   - create, update, delete, deleteMany
//   - Claims (assigns crewId — NOT idempotent)
//   - Imports (creates records — NOT idempotent without dedup)
//   - Bulk operations (partial success state)
//   - Payments, destructive operations
//
// Exception: Admin setup uses P2002 unique constraint as idempotency
// guarantee — the setup endpoint handles P2002 itself, no retry needed.
// ─────────────────────────────────────────────────────────

import { isTransientError } from './db'

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay in ms for exponential backoff (default: 200) */
  baseDelayMs?: number
  /** Maximum delay cap in ms (default: 5000) */
  maxDelayMs?: number
  /** Whether to jitter the backoff (default: true) */
  jitter?: boolean
  /** Operation name for logging */
  operationName?: string
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 200,
  maxDelayMs: 5000,
  jitter: true,
  operationName: 'unknown',
}

/**
 * Execute a function with retry for transient database errors.
 *
 * ONLY use this for read-only / idempotent operations.
 * See module-level documentation for safe/unsafe categories.
 *
 * Backoff strategy: exponential with jitter
 *   delay = min(baseDelay * 2^attempt, maxDelay) ± jitter
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration
 * @returns The result of fn()
 * @throws The last error if all retries fail, or non-transient errors immediately
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Only retry transient errors
      if (!isTransientError(error)) {
        throw error
      }

      // Don't sleep on the last attempt (we're about to throw)
      if (attempt < opts.maxRetries) {
        const delay = calculateBackoff(attempt, opts.baseDelayMs, opts.maxDelayMs, opts.jitter)
        if (opts.operationName !== 'unknown') {
          console.warn(
            `[Retry] ${opts.operationName} attempt ${attempt + 1}/${opts.maxRetries} failed (transient), retrying in ${delay}ms`,
          )
        }
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  if (opts.operationName !== 'unknown') {
    console.error(
      `[Retry] ${opts.operationName} failed after ${opts.maxRetries + 1} attempts`,
    )
  }
  throw lastError
}

/**
 * Calculate exponential backoff delay with optional jitter.
 *
 * Formula: min(baseDelay * 2^attempt, maxDelay) ± random jitter
 * Jitter range: ±25% of calculated delay
 */
function calculateBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitter: boolean,
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs)

  if (!jitter) return cappedDelay

  // ±25% jitter to prevent thundering herd
  const jitterRange = cappedDelay * 0.25
  const jitterOffset = (Math.random() * 2 - 1) * jitterRange
  return Math.max(0, Math.round(cappedDelay + jitterOffset))
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────────────────
// Retry policy documentation (exported for health/audit endpoints)
// ─────────────────────────────────────────────────────────
export const RETRY_POLICY = {
  maxRetries: 3,
  baseDelayMs: 200,
  maxDelayMs: 5000,
  backoffStrategy: 'exponential_with_jitter',
  jitterRange: '±25%',
  safeOperations: [
    'findMany', 'findFirst', 'findUnique', 'count',
    'aggregate', 'groupBy', '$queryRaw (SELECT)',
    'health check', 'dashboard read queries',
  ],
  unsafeOperations: [
    'create', 'update', 'delete', 'deleteMany',
    'claim (assign crewId)', 'import (create records)',
    'bulk operations', 'payments', 'destructive operations',
  ],
  notes: [
    'Retries ONLY apply to transient errors (P1001, P1002, P1008, ECONNREFUSED, etc.)',
    'Non-transient errors (P2002 unique violation, P2025 record not found) are never retried',
    'Admin setup handles P2002 internally — no retry wrapper needed',
    'Import operations have their own dedup logic — retry would risk double-processing',
  ],
} as const
