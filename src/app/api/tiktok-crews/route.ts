import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, AuthenticationError } from '@/lib/auth'
import { rateLimit, rateLimitHeaders, getClientId, RATE_LIMITS } from '@/lib/rate-limit'

// Authenticated endpoint — returns crews from TikTok-active groups
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const clientId = getClientId(request)
    const rl = await rateLimit(`tiktok-crews:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })

    const activeGroups = await db.group.findMany({
      where: { tiktokActive: true },
      select: { id: true },
    })
    const activeGroupIds = activeGroups.map(g => g.id)

    if (activeGroupIds.length === 0) return NextResponse.json([])

    const crews = await db.crew.findMany({
      where: { groupId: { in: activeGroupIds } },
      select: {
        id: true,
        name: true,
        employeeId: true,
        photo: true,
        groupId: true,
        group: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(crews)
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('Get tiktok crews error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}