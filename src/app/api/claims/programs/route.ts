import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, AuthenticationError } from '@/lib/auth'
import { rateLimit, rateLimitHeaders, getClientId, RATE_LIMITS } from '@/lib/rate-limit'

// ─────────────────────────────────────────────
// GET /api/claims/programs — List unique program values
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const clientId = getClientId(request)
    const rl = await rateLimit(`claims-programs:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })

    const programs = await db.sale.findMany({
      where: {
        program: { not: null },
      },
      select: { program: true },
      distinct: ['program'],
      orderBy: { program: 'asc' },
    })

    const programList = programs
      .map((p) => p.program)
      .filter((p): p is string => p !== null && p.trim() !== '')

    return NextResponse.json({ programs: programList })
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('Get programs error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
