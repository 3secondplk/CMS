import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/dashboard/group-detail?groupId=xxx&period=daily
// Returns crew list within a group with total qty, penjualan, struk count, basket size, price point
// period: daily (default), weekly, monthly
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const period = searchParams.get('period') || 'daily' // daily, weekly, monthly

    if (!groupId) {
      return NextResponse.json({ error: 'groupId diperlukan' }, { status: 400 })
    }

    // Get current date in WIB (GMT+7)
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const wibNow = new Date(utc + 7 * 3600000)

    const currentMonth = wibNow.getMonth()
    const currentYear = wibNow.getFullYear()
    const dayOfMonth = wibNow.getDate()
    const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

    // Determine date range based on period
    let prismaDateFilter: Record<string, unknown>
    let sqlDateCondition: Prisma.Sql
    let periodLabel: string

    // Calculate week range for weekly period
    let currentWeek = 1
    if (dayOfMonth <= 7) currentWeek = 1
    else if (dayOfMonth <= 14) currentWeek = 2
    else if (dayOfMonth <= 21) currentWeek = 3
    else currentWeek = 4
    const weekStart = (currentWeek - 1) * 7 + 1
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const weekEnd = currentWeek === 4 ? daysInMonth : Math.min(currentWeek * 7, daysInMonth)
    const weekStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(weekStart).padStart(2, '0')}`
    const weekEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(weekEnd).padStart(2, '0')}`

    switch (period) {
      case 'daily':
        prismaDateFilter = { startsWith: todayStr }
        sqlDateCondition = Prisma.sql`AND tanggal LIKE ${todayStr + '%'}`
        periodLabel = `${dayOfMonth} ${shortMonths[currentMonth]} ${currentYear}`
        break
      case 'weekly':
        prismaDateFilter = { gte: weekStartStr, lte: weekEndStr }
        sqlDateCondition = Prisma.sql`AND tanggal >= ${weekStartStr} AND tanggal <= ${weekEndStr}`
        periodLabel = `Minggu ${currentWeek} (${weekStart}–${weekEnd})`
        break
      case 'monthly':
        prismaDateFilter = { startsWith: monthPrefix }
        sqlDateCondition = Prisma.sql`AND tanggal LIKE ${monthPrefix + '%'}`
        periodLabel = `${monthNames[currentMonth]} ${currentYear}`
        break
      default:
        prismaDateFilter = { startsWith: todayStr }
        sqlDateCondition = Prisma.sql`AND tanggal LIKE ${todayStr + '%'}`
        periodLabel = todayStr
    }

    // Get group with crews
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: { crews: { orderBy: { name: 'asc' } } },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group tidak ditemukan' }, { status: 404 })
    }

    const crewIds = group.crews.map(c => c.id)

    if (crewIds.length === 0) {
      return NextResponse.json({
        group: { id: group.id, name: group.name, logo: group.logo, monthlyTarget: group.monthlyTarget },
        period: periodLabel,
        periodKey: period,
        crews: [],
        groupTotal: { qty: 0, settle: 0, struk: 0, basketSize: 0, pricePoint: 0 },
      })
    }

    // Parallel queries: settle/qty aggregation + struk count per crew
    const [aggResult, strukResult] = await Promise.all([
      db.sale.groupBy({
        by: ['crewId'],
        where: { crewId: { in: crewIds }, tanggal: prismaDateFilter },
        _sum: { settle: true, qty: true },
        _count: true,
      }),
      // Count unique idPenjualan (transaction/receipt IDs) per crew
      db.$queryRaw<Array<{ crewId: string; count: number }>>`
        SELECT crewId, COUNT(DISTINCT idPenjualan) as count
        FROM Sale
        WHERE crewId IN (${Prisma.join(crewIds)}) AND idPenjualan IS NOT NULL ${sqlDateCondition}
        GROUP BY crewId
      `,
    ])

    const aggMap = new Map(aggResult.map(a => [a.crewId, a]))
    const strukMap = new Map(strukResult.map(r => [r.crewId, Number(r.count)]))

    // Build crew stats
    const crews = group.crews.map(crew => {
      const agg = aggMap.get(crew.id)
      const struk = strukMap.get(crew.id) ?? 0
      const qty = agg?._sum.qty ?? 0
      const settle = agg?._sum.settle ?? 0
      const basketSize = struk > 0 ? qty / struk : 0
      const pricePoint = qty > 0 ? settle / qty : 0

      return {
        id: crew.id,
        name: crew.name,
        photo: crew.photo,
        employeeId: crew.employeeId,
        totalQty: qty,
        totalSettle: settle,
        totalStruk: struk,
        basketSize: Math.round(basketSize * 100) / 100,
        pricePoint: Math.round(pricePoint),
        itemCount: agg?._count ?? 0,
      }
    })

    // Sort by totalSettle descending
    crews.sort((a, b) => b.totalSettle - a.totalSettle)

    // Group totals
    const groupTotalQty = crews.reduce((s, c) => s + c.totalQty, 0)
    const groupTotalSettle = crews.reduce((s, c) => s + c.totalSettle, 0)
    const groupTotalStruk = crews.reduce((s, c) => s + c.totalStruk, 0)
    const groupBasketSize = groupTotalStruk > 0 ? Math.round((groupTotalQty / groupTotalStruk) * 100) / 100 : 0
    const groupPricePoint = groupTotalQty > 0 ? Math.round(groupTotalSettle / groupTotalQty) : 0

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        logo: group.logo,
        monthlyTarget: group.monthlyTarget,
      },
      period: periodLabel,
      periodKey: period,
      crews,
      groupTotal: {
        qty: groupTotalQty,
        settle: groupTotalSettle,
        struk: groupTotalStruk,
        basketSize: groupBasketSize,
        pricePoint: groupPricePoint,
      },
    })
  } catch (error) {
    console.error('Group detail error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
