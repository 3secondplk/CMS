import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// ─────────────────────────────────────────────
// GET /api/claims/search — Case-insensitive search for SQLite
// SQLite LIKE is already case-insensitive for ASCII by default.
// This route does NOT use Prisma's mode: 'insensitive' which only works in PostgreSQL/MongoDB.
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) return auth as NextResponse
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const search = searchParams.get('search') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const program = searchParams.get('program') || ''
    const claimed = searchParams.get('claimed') || ''
    const crewId = searchParams.get('crewId') || ''

    // Build Prisma where clause
    const where: Record<string, any> = {}

    // Claimed filter
    if (claimed === 'true') {
      where.crewId = crewId ? crewId : { not: null }
    } else if (claimed === 'false') {
      where.crewId = { equals: null }
    } else if (crewId) {
      where.crewId = crewId
    }

    // Case-insensitive search using SQLite's native LIKE (case-insensitive for ASCII)
    if (search) {
      const searchConditions: Record<string, any>[] = [
        { kodeExtend: { contains: search } },
        { brand: { contains: search } },
        { dept: { contains: search } },
      ]
      if (claimed !== 'false') {
        searchConditions.push({ crew: { name: { contains: search } } })
      }
      where.OR = searchConditions
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const tanggalFilter: Record<string, unknown> = {}
      if (dateFrom) tanggalFilter.gte = dateFrom
      if (dateTo) {
        const [y, m, d] = dateTo.split('-').map(Number)
        const nextDay = new Date(y, m - 1, d + 1)
        const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
        tanggalFilter.lt = nextDayStr
      }
      where.tanggal = tanggalFilter
    }

    // Program filter
    if (program) {
      where.program = program
    }

    const [sales, total, summary, strukGroups] = await Promise.all([
      db.sale.findMany({
        where,
        include: {
          crew: {
            select: { id: true, name: true, employeeId: true, photo: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sale.count({ where }),
      db.sale.aggregate({
        _sum: { qty: true, settle: true, hjp: true },
        where,
      }),
      db.sale.groupBy({
        by: ['idPenjualan'],
        where: { ...where, idPenjualan: { not: null } },
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))

    const totalQty = summary._sum.qty ?? 0
    const totalSettle = summary._sum.settle ?? 0
    const totalStruk = strukGroups.length
    const basketSize = totalStruk > 0 ? totalQty / totalStruk : 0
    const pricePoint = totalQty > 0 ? totalSettle / totalQty : 0

    return NextResponse.json({
      sales,
      total,
      page,
      totalPages,
      summary: {
        totalQty,
        totalSettle,
        totalStruk,
        basketSize,
        pricePoint,
      },
    })
  } catch (error) {
    console.error('Search claims error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
