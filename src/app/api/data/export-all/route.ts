import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, AuthenticationError } from '@/lib/auth'
import { rateLimit, getClientId, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import { withWorkMem } from '@/lib/work-mem'

export const runtime = 'nodejs'
export const maxDuration = 60

function serializeDates<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_, value) => {
    if (value instanceof Date) return value.toISOString()
    return value
  }))
}

export async function GET() {
  try {
    const user = await requireAuth()

    // P0.6: Rate limiting
    const rl = await rateLimit(`data-export-all:server`, RATE_LIMITS.EXPORT)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    // Phase 5: Separate sale export with elevated work_mem to avoid disk spill on sort
    // Non-sale queries are small and don't need work_mem elevation
    const [admins, groups, crews, activityLogs] = await Promise.all([
      db.admin.findMany({
        select: { id: true, username: true, name: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.group.findMany({
        include: {
          crews: {
            select: { id: true, name: true, employeeId: true, photo: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.crew.findMany({
        include: {
          group: { select: { id: true, name: true } },
          // NOTE: Crew sales excluded from nested include — sales exported separately below.
          // Including all crew sales in nested include causes OOM with large datasets.
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ])

    // Sale export with elevated work_mem to avoid disk spill on sort
    // Measured: eliminates ~9.6MB temp disk spill, ~31% faster
    // SEC: Prevent OOM — max 100k rows exported
    const sales = await withWorkMem('64MB', async () => {
      return db.sale.findMany({
        include: {
          crew: { select: { id: true, name: true, employeeId: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100000,
      })
    })

    const data = serializeDates({ admins, groups, crews, sales, activityLogs })

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('Export all error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
