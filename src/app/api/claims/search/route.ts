import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// ─────────────────────────────────────────────────────────────
// GET /api/claims/search — True case-insensitive search for SQLite
// Uses LOWER() on both sides to guarantee case-insensitive matching
// regardless of SQLite PRAGMA case_sensitive_like setting.
// ─────────────────────────────────────────────────────────────

function buildSearchConditions(search: string, includeCrew: boolean) {
  // Escape SQL LIKE wildcards in search term
  const escaped = search.replace(/%/g, '\\%').replace(/_/g, '\\_')
  const pattern = `%${escaped}%`

  const conditions: Prisma.Sql[] = [
    Prisma.sql`LOWER("Sale"."kodeExtend") LIKE LOWER(${pattern}) ESCAPE '\\'`,
    Prisma.sql`LOWER("Sale"."brand") LIKE LOWER(${pattern}) ESCAPE '\\'`,
    Prisma.sql`LOWER("Sale"."dept") LIKE LOWER(${pattern}) ESCAPE '\\'`,
    Prisma.sql`LOWER("Sale"."modul") LIKE LOWER(${pattern}) ESCAPE '\\'`,
  ]

  if (includeCrew) {
    conditions.push(
      Prisma.sql`LOWER("crew"."name") LIKE LOWER(${pattern}) ESCAPE '\\'`
    )
  }

  return conditions
}

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

    // ── Use raw SQL for search to guarantee LOWER() case-insensitive matching ──
    if (search) {
      const includeCrew = claimed !== 'false'
      const searchConditions = buildSearchConditions(search, includeCrew)
      const searchWhere = Prisma.join(searchConditions, ' OR ')

      // Build non-search filter clauses
      const nonSearchClauses: Prisma.Sql[] = []

      // Claimed filter
      if (claimed === 'true') {
        nonSearchClauses.push(crewId
          ? Prisma.sql`"Sale"."crewId" = ${crewId}`
          : Prisma.sql`"Sale"."crewId" IS NOT NULL`
        )
      } else if (claimed === 'false') {
        nonSearchClauses.push(Prisma.sql`"Sale"."crewId" IS NULL`)
      } else if (crewId) {
        nonSearchClauses.push(Prisma.sql`"Sale"."crewId" = ${crewId}`)
      }

      // Date range filter
      if (dateFrom || dateTo) {
        if (dateFrom && dateTo) {
          const [y, m, d] = dateTo.split('-').map(Number)
          const nextDay = new Date(y, m - 1, d + 1)
          const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
          nonSearchClauses.push(
            Prisma.sql`"Sale"."tanggal" >= ${dateFrom} AND "Sale"."tanggal" < ${nextDayStr}`
          )
        } else if (dateFrom) {
          nonSearchClauses.push(Prisma.sql`"Sale"."tanggal" >= ${dateFrom}`)
        } else {
          nonSearchClauses.push(Prisma.sql`"Sale"."tanggal" <= ${dateTo}`)
        }
      }

      // Program filter
      if (program) {
        nonSearchClauses.push(Prisma.sql`"Sale"."program" = ${program}`)
      }

      // Combine: (search conditions) AND (non-search conditions)
      let whereSql: Prisma.Sql
      if (nonSearchClauses.length > 0) {
        const nonSearchWhere = Prisma.join(nonSearchClauses, ' AND ')
        whereSql = Prisma.sql`(${searchWhere}) AND (${nonSearchWhere})`
      } else {
        whereSql = searchWhere
      }

      const offset = (page - 1) * limit

      // Fetch sales with crew info
      const sales = await db.$queryRawUnsafe(`
        SELECT
          "Sale"."id", "Sale"."tanggal", "Sale"."kodeExtend", "Sale"."qty",
          "Sale"."hjp", "Sale"."netto", "Sale"."diskon", "Sale"."diskonRp",
          "Sale"."potongan", "Sale"."potonganV", "Sale"."settle",
          "Sale"."pembayaran", "Sale"."program", "Sale"."channelStock",
          "Sale"."idPenjualan", "Sale"."statusRetention", "Sale"."retentionCode",
          "Sale"."brand", "Sale"."dept", "Sale"."modul", "Sale"."ukuran",
          "Sale"."crewId", "Sale"."claimedAt", "Sale"."createdAt",
          "crew"."id" AS "crewId_", "crew"."name" AS "crewName",
          "crew"."employeeId" AS "crewEmployeeId", "crew"."photo" AS "crewPhoto"
        FROM "Sale"
        LEFT JOIN "Crew" AS "crew" ON "Sale"."crewId" = "crew"."id"
        WHERE ${whereSql.sql}
        ORDER BY "Sale"."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `, ...whereSql.values) as any[]

      // Format sales to match Prisma's include format (convert BigInt to Number)
      const formattedSales = sales.map(s => ({
        id: s.id,
        tanggal: s.tanggal,
        kodeExtend: s.kodeExtend,
        qty: Number(s.qty ?? 0),
        hjp: Number(s.hjp ?? 0),
        netto: Number(s.netto ?? 0),
        diskon: Number(s.diskon ?? 0),
        diskonRp: Number(s.diskonRp ?? 0),
        potongan: Number(s.potongan ?? 0),
        potonganV: Number(s.potonganV ?? 0),
        settle: Number(s.settle ?? 0),
        pembayaran: s.pembayaran,
        program: s.program,
        channelStock: s.channelStock,
        idPenjualan: s.idPenjualan,
        statusRetention: s.statusRetention,
        retentionCode: s.retentionCode,
        brand: s.brand,
        dept: s.dept,
        modul: s.modul,
        ukuran: s.ukuran,
        crewId: s.crewId,
        claimedAt: s.claimedAt,
        createdAt: s.createdAt,
        crew: s.crewId_ ? {
          id: s.crewId_,
          name: s.crewName,
          employeeId: s.crewEmployeeId,
          photo: s.crewPhoto,
        } : null,
      }))

      // Count total
      const countResult = await db.$queryRawUnsafe(
        `SELECT COUNT(*) as total FROM "Sale" LEFT JOIN "Crew" AS "crew" ON "Sale"."crewId" = "crew"."id" WHERE ${whereSql.sql}`,
        ...whereSql.values
      ) as any[]
      const total = Number(countResult[0]?.total || 0)

      // Summary (include JOIN for crew search condition)
      const summaryResult = await db.$queryRawUnsafe(
        `SELECT COALESCE(SUM("Sale"."qty"), 0) as totalQty, COALESCE(SUM("Sale"."settle"), 0) as totalSettle, COALESCE(SUM("Sale"."hjp"), 0) as totalHjp FROM "Sale" LEFT JOIN "Crew" AS "crew" ON "Sale"."crewId" = "crew"."id" WHERE ${whereSql.sql}`,
        ...whereSql.values
      ) as any[]
      const totalQty = Number(summaryResult[0]?.totalQty || 0)
      const totalSettle = Number(summaryResult[0]?.totalSettle || 0)

      // Struk count (include JOIN for crew search condition)
      const strukResult = await db.$queryRawUnsafe(
        `SELECT COUNT(DISTINCT "Sale"."idPenjualan") as totalStruk FROM "Sale" LEFT JOIN "Crew" AS "crew" ON "Sale"."crewId" = "crew"."id" WHERE "Sale"."idPenjualan" IS NOT NULL AND "Sale"."idPenjualan" != '' AND (${whereSql.sql})`,
        ...whereSql.values
      ) as any[]
      const totalStruk = Number(strukResult[0]?.totalStruk || 0)
      const basketSize = totalStruk > 0 ? totalQty / totalStruk : 0
      const pricePoint = totalQty > 0 ? totalSettle / totalQty : 0

      const totalPages = Math.max(1, Math.ceil(total / limit))

      return NextResponse.json({
        sales: formattedSales,
        total,
        page,
        totalPages,
        summary: { totalQty, totalSettle, totalStruk, basketSize, pricePoint },
      })
    }

    // ── No search term: use standard Prisma query ──
    const where: Record<string, any> = {}

    if (claimed === 'true') {
      where.crewId = crewId ? crewId : { not: null }
    } else if (claimed === 'false') {
      where.crewId = { equals: null }
    } else if (crewId) {
      where.crewId = crewId
    }

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
      summary: { totalQty, totalSettle, totalStruk, basketSize, pricePoint },
    })
  } catch (error) {
    console.error('Search claims error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
