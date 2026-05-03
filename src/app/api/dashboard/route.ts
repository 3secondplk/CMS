import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) return auth as NextResponse
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today' // today, week, month
    const groupId = searchParams.get('groupId')

    // Get current date in WIB (GMT+7) — correctly strip local offset first
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const wibNow = new Date(utc + 7 * 3600000)
    
    const currentMonth = wibNow.getMonth()
    const currentYear = wibNow.getFullYear()
    const dayOfMonth = wibNow.getDate()
    const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`

    // Determine current week
    let currentWeek = 1
    if (dayOfMonth <= 7) currentWeek = 1
    else if (dayOfMonth <= 14) currentWeek = 2
    else if (dayOfMonth <= 21) currentWeek = 3
    else currentWeek = 4

    const weekStart = (currentWeek - 1) * 7 + 1
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const weekEnd = currentWeek === 4 ? daysInMonth : Math.min(currentWeek * 7, daysInMonth)
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

    // Get all crews with their groups
    const crewWhere: Record<string, unknown> = {}
    if (groupId) crewWhere.groupId = groupId

    const crews = await db.crew.findMany({
      where: crewWhere,
      include: { group: true },
    })
    const crewIds = crews.map(c => c.id)

    // Calculate week date range string for accurate weekly queries
    const weekStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(weekStart).padStart(2, '0')}`
    const weekEndStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(weekEnd).padStart(2, '0')}`
    // BUGFIX: use next day after weekEnd for lt comparison (handles timestamps like "2026-05-03 09:00")
    const weekEndNextDay = new Date(currentYear, currentMonth, weekEnd + 1)
    const weekEndNextDayStr = `${weekEndNextDay.getFullYear()}-${String(weekEndNextDay.getMonth() + 1).padStart(2, '0')}-${String(weekEndNextDay.getDate()).padStart(2, '0')}`

    // Use groupBy aggregation — MUCH lighter than loading all rows
    const [monthAgg, todayAgg, weekAgg, allTimeAgg] = crewIds.length > 0
      ? await Promise.all([
          db.sale.groupBy({
            by: ['crewId'],
            where: { crewId: { in: crewIds }, tanggal: { startsWith: monthPrefix } },
            _sum: { settle: true, qty: true },
            _count: true,
          }),
          db.sale.groupBy({
            by: ['crewId'],
            where: { crewId: { in: crewIds }, tanggal: { startsWith: todayStr } },
            _sum: { settle: true, qty: true },
            _count: true,
          }),
          db.sale.groupBy({
            by: ['crewId'],
            where: { crewId: { in: crewIds }, tanggal: { gte: weekStartStr, lt: weekEndNextDayStr } },
            _sum: { settle: true, qty: true },
            _count: true,
          }),
          db.sale.groupBy({
            by: ['crewId'],
            where: { crewId: { in: crewIds } },
            _sum: { settle: true, qty: true },
            _count: true,
          }),
        ])
      : [[], [], [], []]

    // Build crewId → aggregate lookup maps
    const monthMap = new Map(monthAgg.map(a => [a.crewId, a]))
    const todayMap = new Map(todayAgg.map(a => [a.crewId, a]))
    const weekMap = new Map(weekAgg.map(a => [a.crewId, a]))
    const allTimeMap = new Map(allTimeAgg.map(a => [a.crewId, a]))

    // Struk counts per crew per period — using COUNT(DISTINCT idPenjualan)
    // idPenjualan = transaction/receipt ID from POS system
    // One struk can have multiple item rows sharing the same idPenjualan
    // Quoted identifiers for PostgreSQL compatibility (also works in SQLite)
    const [todayStrukRaw, weekStrukRaw, monthStrukRaw, allTimeStrukRaw] = crewIds.length > 0
      ? await Promise.all([
          db.$queryRaw<Array<{ crewId: string; count: number }>>`
            SELECT "crewId", COUNT(DISTINCT "idPenjualan") as count
            FROM "Sale"
            WHERE "crewId" IN (${Prisma.join(crewIds)}) AND "idPenjualan" IS NOT NULL AND "tanggal" LIKE ${todayStr + '%'}
            GROUP BY "crewId"
          `,
          db.$queryRaw<Array<{ crewId: string; count: number }>>`
            SELECT "crewId", COUNT(DISTINCT "idPenjualan") as count
            FROM "Sale"
            WHERE "crewId" IN (${Prisma.join(crewIds)}) AND "idPenjualan" IS NOT NULL AND "tanggal" >= ${weekStartStr} AND "tanggal" < ${weekEndNextDayStr}
            GROUP BY "crewId"
          `,
          db.$queryRaw<Array<{ crewId: string; count: number }>>`
            SELECT "crewId", COUNT(DISTINCT "idPenjualan") as count
            FROM "Sale"
            WHERE "crewId" IN (${Prisma.join(crewIds)}) AND "idPenjualan" IS NOT NULL AND "tanggal" LIKE ${monthPrefix + '%'}
            GROUP BY "crewId"
          `,
          db.$queryRaw<Array<{ crewId: string; count: number }>>`
            SELECT "crewId", COUNT(DISTINCT "idPenjualan") as count
            FROM "Sale"
            WHERE "crewId" IN (${Prisma.join(crewIds)}) AND "idPenjualan" IS NOT NULL
            GROUP BY "crewId"
          `,
        ])
      : [[], [], [], []]

    const todayStrukMap = new Map(todayStrukRaw.map(r => [r.crewId, Number(r.count)]))
    const weekStrukMap = new Map(weekStrukRaw.map(r => [r.crewId, Number(r.count)]))
    const monthStrukMap = new Map(monthStrukRaw.map(r => [r.crewId, Number(r.count)]))
    const allTimeStrukMap = new Map(allTimeStrukRaw.map(r => [r.crewId, Number(r.count)]))

    // Calculate per-crew stats from aggregated data

    // Build group info map from already-loaded crew.group data
    const groupInfoMap = new Map<string, { monthlyTarget: number; crewCount: number; weeklyTargetPcts: number[] }>()
    for (const crew of crews) {
      if (!groupInfoMap.has(crew.group.id)) {
        groupInfoMap.set(crew.group.id, {
          monthlyTarget: crew.group.monthlyTarget,
          crewCount: 0,
          weeklyTargetPcts: [crew.group.week1Target, crew.group.week2Target, crew.group.week3Target, crew.group.week4Target],
        })
      }
      groupInfoMap.get(crew.group.id)!.crewCount++
    }

    const crewStats = crews.map(crew => {
      const mAgg = monthMap.get(crew.id)
      const tAgg = todayMap.get(crew.id)
      const wAgg = weekMap.get(crew.id)
      const aAgg = allTimeMap.get(crew.id)

      const monthTotal = mAgg?._sum.settle ?? 0
      const monthQty = mAgg?._sum.qty ?? 0
      const todayTotal = tAgg?._sum.settle ?? 0
      const todayQty = tAgg?._sum.qty ?? 0
      const weekTotal = wAgg?._sum.settle ?? 0
      const weekQty = wAgg?._sum.qty ?? 0
      const allTimeTotal = aAgg?._sum.settle ?? 0
      const allTimeQty = aAgg?._sum.qty ?? 0

      // Struk counts (unique transactions/receipts) per period
      const todayStruk = todayStrukMap.get(crew.id) ?? 0
      const weekStruk = weekStrukMap.get(crew.id) ?? 0
      const monthStruk = monthStrukMap.get(crew.id) ?? 0
      const allTimeStruk = allTimeStrukMap.get(crew.id) ?? 0

      // ── Target per Crew calculation ──
      const gInfo = groupInfoMap.get(crew.group.id)
      const crewCount = gInfo?.crewCount ?? 1
      const groupMonthlyTarget = gInfo?.monthlyTarget ?? 0
      const weeklyPcts = gInfo?.weeklyTargetPcts ?? [0, 0, 0, 0]

      const crewMonthlyTarget = crewCount > 0 ? Math.round(groupMonthlyTarget / crewCount) : 0
      const crewWeeklyTargets = weeklyPcts.map(pct => Math.round((crewMonthlyTarget * pct) / 100))
      const crewCurrentWeekTarget = crewWeeklyTargets[currentWeek - 1] ?? 0
      const crewMonthlyAchievement = crewMonthlyTarget > 0 ? Math.min(Math.round((monthTotal / crewMonthlyTarget) * 100), 999) : 0
      const crewWeeklyAchievement = crewCurrentWeekTarget > 0 ? Math.min(Math.round((weekTotal / crewCurrentWeekTarget) * 100), 999) : 0

      return {
        id: crew.id,
        name: crew.name,
        photo: crew.photo,
        employeeId: crew.employeeId,
        groupId: crew.group.id,
        groupName: crew.group.name,
        groupLogo: crew.group.logo,
        todayTotal,
        todayQty,
        todayStruk,
        weekTotal,
        weekQty,
        weekStruk,
        monthTotal,
        monthQty,
        monthStruk,
        allTimeTotal,
        allTimeQty,
        allTimeStruk,
        transactionCount: aAgg?._count ?? 0,
        // Target fields
        crewMonthlyTarget,
        crewMonthlyAchievement,
        crewWeeklyTargets,
        crewCurrentWeekTarget,
        crewWeeklyAchievement,
        currentWeek,
        groupMonthlyTarget,
        groupWeeklyTargetPcts: weeklyPcts,
      }
    })

    // Sort by relevant period
    let sortedCrews = [...crewStats]
    switch (period) {
      case 'today':
        sortedCrews.sort((a, b) => b.todayTotal - a.todayTotal)
        break
      case 'week':
        sortedCrews.sort((a, b) => b.weekTotal - a.weekTotal)
        break
      case 'month':
        sortedCrews.sort((a, b) => b.monthTotal - a.monthTotal)
        break
    }

    // Calculate totals — include ALL sales (claimed + unclaimed)
    const [allTodayAgg, allWeekAgg, allMonthAgg, totalTxRaw] = await Promise.all([
      db.sale.aggregate({
        _sum: { settle: true, qty: true },
        where: { tanggal: { startsWith: todayStr } },
      }),
      db.sale.aggregate({
        _sum: { settle: true, qty: true },
        where: { tanggal: { gte: weekStartStr, lt: weekEndNextDayStr } },
      }),
      db.sale.aggregate({
        _sum: { settle: true, qty: true },
        where: { tanggal: { startsWith: monthPrefix } },
      }),
      db.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(DISTINCT "idPenjualan") as count
        FROM "Sale"
        WHERE "idPenjualan" IS NOT NULL
      `,
    ])

    const totalTransactions = Number(totalTxRaw[0]?.count ?? 0)

    const totals = {
      today: allTodayAgg._sum.settle ?? 0,
      week: allWeekAgg._sum.settle ?? 0,
      month: allMonthAgg._sum.settle ?? 0,
      todayQty: allTodayAgg._sum.qty ?? 0,
      weekQty: allWeekAgg._sum.qty ?? 0,
      monthQty: allMonthAgg._sum.qty ?? 0,
      totalTransactions,
    }

    // --- Trends: compare current period totals with previous period ---
    const formatDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    // Previous period date calculations (all in WIB)
    const yesterdayDate = new Date(wibNow)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayStr = formatDateStr(yesterdayDate)

    // Last week: previous 7-day window ending yesterday
    const lastWeekStart = new Date(yesterdayDate)
    lastWeekStart.setDate(lastWeekStart.getDate() - 6)
    const lastWeekStartStr = formatDateStr(lastWeekStart)
    const lastWeekEndStr = yesterdayStr
    // BUGFIX: use next day after lastWeekEnd for lt comparison
    const lastWeekEndNextDay = new Date(yesterdayDate)
    lastWeekEndNextDay.setDate(lastWeekEndNextDay.getDate() + 1)
    const lastWeekEndNextDayStr = formatDateStr(lastWeekEndNextDay)

    // Last month: first day of previous month used as prefix
    const lastMonthDate = new Date(wibNow.getFullYear(), wibNow.getMonth() - 1, 1)
    const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

    // Base where clause for groupId filter on sales
    const saleGroupFilter = groupId ? { crew: { groupId } } : {}

    // PERF: Merge groups + recentSales + trend queries into single parallel batch (was 2 sequential rounds, now 1)
    const [groups, recentSales, yesterdayAgg, lastWeekAgg, lastMonthAgg] = await Promise.all([
      db.group.findMany({
        include: { crews: { select: { id: true } } },
      }),
      db.sale.findMany({
        take: 25,
        where: { crewId: { not: null } },
        include: {
          crew: {
            select: { name: true, photo: true, group: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.sale.aggregate({
        _sum: { settle: true },
        where: { ...saleGroupFilter, tanggal: { startsWith: yesterdayStr } },
      }),
      db.sale.aggregate({
        _sum: { settle: true },
        where: { ...saleGroupFilter, tanggal: { gte: lastWeekStartStr, lt: lastWeekEndNextDayStr } },
      }),
      db.sale.aggregate({
        _sum: { settle: true },
        where: { ...saleGroupFilter, tanggal: { startsWith: lastMonthStr } },
      }),
    ])

    const calcTrend = (current: number, previous: number | null) => {
      const prev = previous ?? 0
      if (prev === 0) {
        return { previousValue: prev, changePercent: null, direction: 'same' as const }
      }
      const changePercent = Math.round(((current - prev) / prev) * 10000) / 100
      return {
        previousValue: prev,
        changePercent,
        direction: (changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'same') as 'up' | 'down' | 'same',
      }
    }

    const trends = {
      today: calcTrend(totals.today, yesterdayAgg._sum.settle),
      week: calcTrend(totals.week, lastWeekAgg._sum.settle),
      month: calcTrend(totals.month, lastMonthAgg._sum.settle),
    }

    // Group/Zoning achievements — use actual weekly data from weekMap
    const groupAchievements = groups.map(group => {
      const groupMonthTotal = group.crews.reduce((sum, c) => sum + (monthMap.get(c.id)?._sum.settle ?? 0), 0)
      const weeklyTotal = group.crews.reduce((sum, c) => sum + (weekMap.get(c.id)?._sum.settle ?? 0), 0)
      
      let weekTargetPct: number
      switch (currentWeek) {
        case 1: weekTargetPct = group.week1Target; break
        case 2: weekTargetPct = group.week2Target; break
        case 3: weekTargetPct = group.week3Target; break
        case 4: weekTargetPct = group.week4Target; break
        default: weekTargetPct = 0
      }

      const monthlyAchievement = group.monthlyTarget > 0 
        ? Math.min((groupMonthTotal / group.monthlyTarget) * 100, 100) 
        : 0
      const weeklyTarget = group.monthlyTarget * (weekTargetPct / 100)
      const weeklyAchievement = weeklyTarget > 0 
        ? Math.min((weeklyTotal / weeklyTarget) * 100, 100) 
        : 0

      // Per-crew target breakdown
      const crewCount = group.crews.length
      const crewMonthlyTarget = crewCount > 0 ? Math.round(group.monthlyTarget / crewCount) : 0
      const weeklyTargetPcts = [group.week1Target, group.week2Target, group.week3Target, group.week4Target]
      const crewWeeklyTargets = weeklyTargetPcts.map(pct => Math.round((crewMonthlyTarget * pct) / 100))

      return {
        id: group.id,
        name: group.name,
        logo: group.logo,
        monthlyTarget: group.monthlyTarget,
        monthlyTotal: groupMonthTotal,
        monthlyAchievement,
        weeklyTarget,
        weeklyTotal,
        weeklyAchievement,
        weekTargetPct,
        currentWeek,
        crewCount,
        crewMonthlyTarget,
        weeklyTargetPcts,
        crewWeeklyTargets,
      }
    })

    // Top 3 crews for leaderboard
    const topCrews = sortedCrews.slice(0, 3)

    return NextResponse.json({
      crewStats: sortedCrews,
      totals,
      trends,
      groupAchievements,
      topCrews,
      recentSales,
      dateInfo: {
        today: todayStr,
        currentWeek,
        weekStart,
        weekEnd,
        currentMonth,
        currentYear,
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
