import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

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
