import { NextResponse } from 'next/server'
import { requireAuth, unauthorized, AuthenticationError } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit, getClientId, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import { withWorkMem } from '@/lib/work-mem'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  try {
    const user = await requireAuth()

    // P0.6: Rate limiting
    const rl = await rateLimit(`data-export:server`, RATE_LIMITS.EXPORT)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    // Export groups first (crews reference groups)
    const groups = await db.group.findMany({
      include: { crews: false },
      orderBy: { createdAt: 'asc' },
    })

    // Then crews (sales reference crews)
    const crews = await db.crew.findMany({
      include: { group: false, sales: false },
      orderBy: { createdAt: 'asc' },
    })

    // Then all sales — Phase 5: use elevated work_mem to avoid disk spill on sort
    // Measured: 189ms → 130ms (31% faster), eliminates 9.6MB temp disk spill
    const sales = await withWorkMem('64MB', async () => {
      return db.sale.findMany({
        orderBy: { createdAt: 'asc' },
      })
    })

    // Serialize Date objects to ISO strings
    const serializedGroups = groups.map(g => ({
      ...g,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }))

    const serializedCrews = crews.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))

    const serializedSales = sales.map(s => ({
      ...s,
      claimedAt: s.claimedAt ? s.claimedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
    }))

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      groups: serializedGroups,
      crews: serializedCrews,
      sales: serializedSales,
    }

    const filename = `cms-backup-${new Date().toISOString().split('T')[0]}.json`
    const json = JSON.stringify(exportData, null, 2)

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) return unauthorized()
    const message = error instanceof Error ? error.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
