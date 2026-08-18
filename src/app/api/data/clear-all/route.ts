import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, AuthenticationError } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'
import { rateLimit, getClientId, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'

export async function DELETE() {
  try {
    const user = await requireAuth()

    // P0.6: Rate limiting
    const clientId = 'server'
    const rl = await rateLimit(`data-clear-all:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    // Count before deletion
    const [salesCount, activityLogsCount, crewsCount, groupsCount] = await Promise.all([
      db.sale.count(),
      db.activityLog.count(),
      db.crew.count(),
      db.group.count(),
    ])

    // Delete in order respecting foreign keys: sales → activityLogs → crews → groups
    const deleteSales = db.sale.deleteMany()
    const deleteActivityLogs = db.activityLog.deleteMany()
    const deleteCrews = db.crew.deleteMany()
    const deleteGroups = db.group.deleteMany()

    await db.$transaction([
      deleteSales,
      deleteActivityLogs,
      deleteCrews,
      deleteGroups,
    ])

    // Log the clear action
    await logActivity('CLEAR_ALL_DATA', {
      description: `Semua data dihapus: ${salesCount} sales, ${crewsCount} crew, ${groupsCount} group, ${activityLogsCount} activity logs`,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Semua data berhasil dihapus',
      deleted: { sales: salesCount, activityLogs: activityLogsCount, crews: crewsCount, groups: groupsCount },
    })
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('Clear all error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
