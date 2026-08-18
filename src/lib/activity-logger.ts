import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

// ─── Security-specific audit actions ─────────────────────────
export const SECURITY_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  SETUP_ADMIN_CREATED: 'SETUP_ADMIN_CREATED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  ORIGIN_VALIDATION_FAILED: 'ORIGIN_VALIDATION_FAILED',
  AUTH_MISSING_SECRET: 'AUTH_MISSING_SECRET',
  LEGACY_PASSWORD_MIGRATED: 'LEGACY_PASSWORD_MIGRATED',
  DATA_CLEAR_ALL: 'DATA_CLEAR_ALL',
  BULK_IMPORT: 'BULK_IMPORT',
  BULK_EXPORT: 'BULK_EXPORT',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
} as const

export type SecurityAction = (typeof SECURITY_ACTIONS)[keyof typeof SECURITY_ACTIONS]

/**
 * Log an activity to the ActivityLog table.
 * Silently catches errors so logging never breaks the main operation.
 *
 * The admin name is extracted from the current JWT session.
 * Additional metadata (count, crewId, etc.) is stored as a JSON string.
 */
export async function logActivity(
  action: string,
  options?: {
    description?: string
    crewName?: string
    saleId?: string
    details?: Record<string, unknown>
  },
): Promise<void> {
  try {
    const user = await getAuthenticatedUser()
    const adminName = user?.name || 'Sistem'

    const metadata: Record<string, unknown> = {
      adminName,
      ...(options?.details ?? {}),
    }

    await db.activityLog.create({
      data: {
        action,
        description: options?.description || action,
        crewName: options?.crewName || null,
        saleId: options?.saleId || null,
        metadata: JSON.stringify(metadata),
      },
    })
  } catch {
    // Silently fail — activity logging must never break the main operation
  }
}

/**
 * Log a security-specific audit event.
 * Unlike logActivity, this does NOT depend on the current JWT session —
 * the caller must supply the subject (e.g. IP, username) explicitly,
 * so security events can be logged even when no session exists
 * (failed logins, rate-limit hits, origin validation failures, etc.).
 */
export async function logSecurityEvent(
  action: SecurityAction,
  options?: {
    description?: string
    subject?: string   // e.g. IP address, username, or "anonymous"
    details?: Record<string, unknown>
  },
): Promise<void> {
  try {
    // Attempt to enrich with the current authenticated user (if any)
    let adminName = options?.subject || 'Sistem'
    try {
      const user = await getAuthenticatedUser()
      if (user?.name) adminName = user.name
    } catch {
      // No session — keep the explicit subject
    }

    const metadata: Record<string, unknown> = {
      adminName,
      securityEvent: true,
      ...(options?.details ?? {}),
    }

    await db.activityLog.create({
      data: {
        action,
        description: options?.description || action,
        crewName: null,
        saleId: null,
        metadata: JSON.stringify(metadata),
      },
    })
  } catch {
    // Silently fail — security logging must never break the main operation
  }
}
