import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────
// GET /api/claims/search — Case-insensitive search for SQLite
// Uses Prisma findMany with contains (LIKE) for reliability.
// SQLite LIKE is case-insensitive for ASCII by default.
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) return auth as NextResponse
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const search = (searchParams.get('search') || '').trim()
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const program = searchParams.get('program') || ''
    const claimed = searchParams.get('claimed') || ''
    const crewId = searchParams.get('crewId') || ''

    // ── Build base filters (date, claimed, program, crew) ──
    const baseFilters: Record<string, any> = {}

    // Claimed filter
    if (claimed === 'true') {
      baseFilters.crewId = crewId ? crewId : { not: null }
    } else if (claimed === 'false') {
      baseFilters.crewId = { equals: null }
    } else if (crewId) {
      baseFilters.crewId = crewId
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
      baseFilters.tanggal = tanggalFilter
    }

    // Program filter
    if (program) {
      baseFilters.program = program
    }

    // ── Build search OR conditions ──
    // SQLite LIKE is case-insensitive for ASCII by default.
    // We also uppercase the search for kodeExtend since that field stores UPPERCASE values,
    // ensuring matches regardless of input case.
    if (search) {
      const searchOr: Record<string, any>[] = [
        { kodeExtend: { contains: search.toUpperCase() } },
        { kodeExtend: { contains: search } },
        { brand: { contains: search } },
        { dept: { contains: search } },
        { modul: { contains: search } },
      ]

      // Include crew name search only when showing claimed items
      if (claimed !== 'false') {
        searchOr.push({ crew: { name: { contains: search } } })
      }

      const where: Record<string, any> = {
        OR: searchOr,
      }

      // Add base filters as AND conditions
      if (Object.keys(baseFilters).length > 0) {
        where.AND = baseFilters
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
      const totalQty = Number(summary._sum.qty ?? 0)
      const totalSettle = Number(summary._sum.settle ?? 0)
      const totalStruk = strukGroups.length
      const basketSize = totalStruk > 0 ? totalQty / totalStruk : 0
      const pricePoint = totalQty > 0 ? totalSettle / totalQty : 0

      return NextResponse.json({
        sales,
        total,
        page,
        totalPages,
        summary: { totalQty, totalSettle, totalStruk, basketSize, pricePoint },
      })
    }

    // ── No search term: use standard Prisma query ──
    const [sales, total, summary, strukGroups] = await Promise.all([
      db.sale.findMany({
        where: baseFilters,
        include: {
          crew: {
            select: { id: true, name: true, employeeId: true, photo: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sale.count({ where: baseFilters }),
      db.sale.aggregate({
        _sum: { qty: true, settle: true, hjp: true },
        where: baseFilters,
      }),
      db.sale.groupBy({
        by: ['idPenjualan'],
        where: { ...baseFilters, idPenjualan: { not: null } },
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
      summary: { totalQty, totalSettle, totalStruk, basketSize, pricePoint },
    })
  } catch (error) {
    console.error('Search claims error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
