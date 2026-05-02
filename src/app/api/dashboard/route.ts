import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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

    // Use groupBy aggregation — MUCH lighter than loading all rows
    // PERF: month and week share same month-prefix data — compute once
    const [monthAgg, todayAgg, allTimeAgg] = crewIds.length > 0
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
            where: { crewId: { in: crewIds } },
            _sum: { settle: true, qty: true },
            _count: true,
          }),
        ])
      : [[], [], []]

    // Build crewId → aggregate lookup maps
    const monthMap = new Map(monthAgg.map(a => [a.crewId, a]))
    const todayMap = new Map(todayAgg.map(a => [a.crewId, a]))
    const allTimeMap = new Map(allTimeAgg.map(a => [a.crewId, a]))

    // Calculate per-crew stats from aggregated data
    const crewStats = crews.map(crew => {
      const mAgg = monthMap.get(crew.id)
      const tAgg = todayMap.get(crew.id)
      const aAgg = allTimeMap.get(crew.id)

      const monthTotal = mAgg?._sum.settle ?? 0
      const monthQty = mAgg?._sum.qty ?? 0
      const todayTotal = tAgg?._sum.settle ?? 0
      const todayQty = tAgg?._sum.qty ?? 0
      const allTimeTotal = aAgg?._sum.settle ?? 0
      const allTimeQty = aAgg?._sum.qty ?? 0

      // Weekly: approximate as month * (weekFraction) — much lighter than filtering by day
      const weekFraction = weekEnd > 0 ? (weekEnd - weekStart + 1) / daysInMonth : 0.25
      const weekTotal = Math.round(monthTotal * weekFraction)
      const weekQty = Math.round(monthQty * weekFraction)

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
        weekTotal,
        weekQty,
        monthTotal,
        monthQty,
        allTimeTotal,
        allTimeQty,
        transactionCount: aAgg?._count ?? 0,
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

    // Calculate totals
    const totals = {
      today: crewStats.reduce((s, c) => s + c.todayTotal, 0),
      week: crewStats.reduce((s, c) => s + c.weekTotal, 0),
      month: crewStats.reduce((s, c) => s + c.monthTotal, 0),
      todayQty: crewStats.reduce((s, c) => s + c.todayQty, 0),
      weekQty: crewStats.reduce((s, c) => s + c.weekQty, 0),
      monthQty: crewStats.reduce((s, c) => s + c.monthQty, 0),
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
        take: 10,
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
        where: { ...saleGroupFilter, tanggal: { gte: lastWeekStartStr, lte: lastWeekEndStr } },
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

    // Group/Zoning achievements — use aggregated monthMap
    const weekFraction = weekEnd > 0 ? (weekEnd - weekStart + 1) / daysInMonth : 0.25

    const groupAchievements = groups.map(group => {
      const groupMonthTotal = group.crews.reduce((sum, c) => sum + (monthMap.get(c.id)?._sum.settle ?? 0), 0)
      const weeklyTotal = Math.round(groupMonthTotal * weekFraction)
      
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
        crewCount: group.crews.length,
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
