import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, AuthenticationError } from '@/lib/auth'
import { rateLimit, getClientId, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import { paginationSchema } from '@/lib/validation'

// ─────────────────────────────────────────────
// GET /api/activity-log — Fetch recent activity logs
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()

    // P0.6: Rate limiting
    const clientId = getClientId(request)
    const rl = await rateLimit(`activity-log:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    const { searchParams } = new URL(request.url)

    // P0.7: Input validation with Zod
    const parsed = paginationSchema.safeParse({
      limit: searchParams.get('limit') || '50',
      page: '1',
    })
    const limit = parsed.success ? parsed.data.limit : 50

    const logs = await db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Parse metadata JSON and shape the response
    const shaped = logs.map(log => {
      let metadata: Record<string, unknown> = {}
      try {
        metadata = log.metadata ? JSON.parse(log.metadata) : {}
      } catch {
        // Ignore malformed JSON
      }

      return {
        id: log.id,
        action: log.action,
        description: log.description,
        crewName: log.crewName,
        saleId: log.saleId,
        adminName: (metadata.adminName as string) || 'Sistem',
        details: metadata,
        createdAt: log.createdAt,
      }
    })

    return NextResponse.json(shaped)
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('Get activity log error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
