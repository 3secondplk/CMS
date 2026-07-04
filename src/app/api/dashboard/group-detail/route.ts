import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'

// GET /api/dashboard/group-detail?groupId=xxx&period=daily
// Returns crew list within a group with total qty, penjualan, struk count, basket size, price point
// period: daily (default), weekly, monthly
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) return auth as NextResponse
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

    // Calculate week range for weekly period (W5 = days 29-end, separated from W4)
    let currentWeek = 1
    if (dayOfMonth <= 7) currentWeek = 1
    else if (dayOfMonth <= 14) currentWeek = 2
    else if (dayOfMonth <= 21) currentWeek = 3
    else if (dayOfMonth <= 28) currentWeek = 4
    else currentWeek = 5
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    let weekStart: number, weekEnd: number
    if (currentWeek <= 4) {
      weekStart = (currentWeek - 1) * 7 + 1
      weekEnd = Math.min(currentWeek * 7, 28)
    } else {
      weekStart = 29
      weekEnd = daysInMonth
    }
    const weekStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(weekStart).padStart(2, '0')}`
    const weekEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(weekEnd).padStart(2, '0')}`
    // BUGFIX: use next day after weekEnd for lt comparison
    const weekEndNextDay = new Date(currentYear, currentMonth, weekEnd + 1)
    const weekEndNextDayStr = `${weekEndNextDay.getFullYear()}-${String(weekEndNextDay.getMonth() + 1).padStart(2, '0')}-${String(weekEndNextDay.getDate()).padStart(2, '0')}`

    switch (period) {
      case 'daily':
        prismaDateFilter = { startsWith: todayStr }
        sqlDateCondition = Prisma.sql`AND "tanggal" LIKE ${todayStr + '%'}`
        periodLabel = `${dayOfMonth} ${shortMonths[currentMonth]} ${currentYear}`
        break
      case 'weekly':
        prismaDateFilter = { gte: weekStartStr, lt: weekEndNextDayStr }
        sqlDateCondition = Prisma.sql`AND "tanggal" >= ${weekStartStr} AND "tanggal" < ${weekEndNextDayStr}`
        periodLabel = `Minggu ${currentWeek} (${weekStart}–${weekEnd})`
        break
      case 'monthly':
        prismaDateFilter = { startsWith: monthPrefix }
        sqlDateCondition = Prisma.sql`AND "tanggal" LIKE ${monthPrefix + '%'}`
        periodLabel = `${monthNames[currentMonth]} ${currentYear}`
        break
      default:
        prismaDateFilter = { startsWith: todayStr }
        sqlDateCondition = Prisma.sql`AND "tanggal" LIKE ${todayStr + '%'}`
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
      const crewCount = 0
      const crewMonthlyTarget = 0
      const weeklyTargetPcts = [group.week1Target, group.week2Target, group.week3Target, group.week4Target, group.week5Target]
      const crewWeeklyTargets = [0, 0, 0, 0, 0]
      return NextResponse.json({
        group: { id: group.id, name: group.name, logo: group.logo, monthlyTarget: group.monthlyTarget },
        period: periodLabel,
        periodKey: period,
        crews: [],
        groupTotal: { qty: 0, settle: 0, struk: 0, basketSize: 0, pricePoint: 0 },
        crewMonthlyTarget,
        weeklyTargetPcts,
        crewWeeklyTargets,
        currentWeek,
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
      // Quoted identifiers for PostgreSQL compatibility
      db.$queryRaw<Array<{ crewId: string; count: number }>>`
        SELECT "crewId", COUNT(DISTINCT "idPenjualan") as count
        FROM "Sale"
        WHERE "crewId" IN (${Prisma.join(crewIds)}) AND "idPenjualan" IS NOT NULL ${sqlDateCondition}
        GROUP BY "crewId"
      `,
    ])

    const aggMap = new Map(aggResult.map(a => [a.crewId, a]))
    const strukMap = new Map(strukResult.map(r => [r.crewId, Number(r.count)]))

    // Build crew stats
    // ── Per-crew target calculation ──
    const crewCount = group.crews.length
    const crewMonthlyTarget = crewCount > 0 ? Math.round(group.monthlyTarget / crewCount) : 0
    const weeklyTargetPcts = [group.week1Target, group.week2Target, group.week3Target, group.week4Target, group.week5Target]
    const crewWeeklyTargets = weeklyTargetPcts.map(pct => Math.round((crewMonthlyTarget * pct) / 100))
    const crewCurrentWeekTarget = crewWeeklyTargets[currentWeek - 1] ?? 0

    // Calculate per-week date ranges for all weeks (W5 only when month has 29+ days)
    const weekRanges = daysInMonth >= 29
      ? [1, 2, 3, 4, 5].map(w => {
          const start = w <= 4 ? (w - 1) * 7 + 1 : 29
          const end = w <= 4 ? Math.min(w * 7, 28) : daysInMonth
          const startStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(start).padStart(2, '0')}`
          const endNextDay = new Date(currentYear, currentMonth, end + 1)
          const endNextDayStr = `${endNextDay.getFullYear()}-${String(endNextDay.getMonth() + 1).padStart(2, '0')}-${String(endNextDay.getDate()).padStart(2, '0')}`
          return { week: w, start, end, startStr, endNextDayStr }
        })
      : [1, 2, 3, 4].map(w => {
          const start = (w - 1) * 7 + 1
          const end = Math.min(w * 7, daysInMonth)
          const startStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(start).padStart(2, '0')}`
          const endNextDay = new Date(currentYear, currentMonth, end + 1)
          const endNextDayStr = `${endNextDay.getFullYear()}-${String(endNextDay.getMonth() + 1).padStart(2, '0')}-${String(endNextDay.getDate()).padStart(2, '0')}`
          return { week: w, start, end, startStr, endNextDayStr }
        })

    // Query per-week aggregation for each crew in this group (parallel queries, dynamic count)
    const weekAggResults = crewIds.length > 0
      ? await Promise.all(weekRanges.map(wr => db.sale.groupBy({
          by: ['crewId'],
          where: { crewId: { in: crewIds }, tanggal: { gte: wr.startStr, lt: wr.endNextDayStr } },
          _sum: { settle: true },
        })))
      : weekRanges.map(() => [])
    const weekAggMaps = weekAggResults.map(agg => new Map(agg.map(a => [a.crewId, a._sum.settle ?? 0])))

    const crews = group.crews.map(crew => {
      const agg = aggMap.get(crew.id)
      const struk = strukMap.get(crew.id) ?? 0
      const qty = agg?._sum.qty ?? 0
      const settle = agg?._sum.settle ?? 0
      const basketSize = struk > 0 ? qty / struk : 0
      const pricePoint = qty > 0 ? settle / qty : 0

      // Calculate monthly total from week aggregations (always current month, regardless of selected period)
      const monthlySettle = weekAggMaps.reduce((sum, wMap) => sum + (wMap.get(crew.id) ?? 0), 0)
      // Current week total (always from week aggregation, not period filter)
      const currentWeekSettle = weekAggMaps[currentWeek - 1]?.get(crew.id) ?? 0

      // Achievement: ALWAYS compare against correct period totals (not affected by selected period filter)
      const monthAchievement = crewMonthlyTarget > 0 ? Math.min(Math.round((monthlySettle / crewMonthlyTarget) * 100), 999) : 0
      const weekAchievement = crewCurrentWeekTarget > 0 ? Math.min(Math.round((currentWeekSettle / crewCurrentWeekTarget) * 100), 999) : 0

      // Per-week achievements for this crew (all 5 weeks; W5 only when month has 29+ days)
      const crewWeeklyDetails = weekRanges.map((wr, i) => {
        const weekTarget = crewWeeklyTargets[i]
        const weekTotalForCrew = weekAggMaps[i].get(crew.id) ?? 0
        const achievement = weekTarget > 0 ? Math.min(Math.round((weekTotalForCrew / weekTarget) * 100), 999) : 0
        return {
          week: wr.week,
          targetPct: weeklyTargetPcts[i],
          target: weekTarget,
          total: weekTotalForCrew,
          achievement,
          dateFrom: wr.start,
          dateTo: wr.end,
        }
      })

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
        crewMonthlyTarget,
        crewCurrentWeekTarget,
        crewMonthlyAchievement: monthAchievement,
        crewWeeklyAchievement: weekAchievement,
        crewWeeklyDetails,
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
      crewMonthlyTarget,
      weeklyTargetPcts,
      crewWeeklyTargets,
      currentWeek,
    })
  } catch (error) {
    console.error('Group detail error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
