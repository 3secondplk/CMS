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

    // ─── Date parsing helper: handles both ISO ("YYYY-MM-DD...") and DD/MM/YYYY format ───
    const parseSaleDate = (tanggal: string): Date | null => {
      if (!tanggal) return null
      // Try ISO format first (fast path)
      if (tanggal.startsWith(todayStr) || tanggal.startsWith(monthPrefix)) {
        return new Date(tanggal)
      }
      // Try DD/MM/YYYY format
      const parts = tanggal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
      if (parts) {
        const day = parseInt(parts[1])
        const month = parseInt(parts[2]) - 1
        let year = parseInt(parts[3])
        if (year < 100) year += 2000
        return new Date(year, month, day)
      }
      // Fallback
      const parsed = new Date(tanggal)
      return isNaN(parsed.getTime()) ? null : parsed
    }

    const isToday = (tanggal: string): boolean => {
      if (tanggal.startsWith(todayStr)) return true
      const d = parseSaleDate(tanggal)
      if (!d) return false
      return d.getFullYear() === wibNow.getFullYear() && d.getMonth() === wibNow.getMonth() && d.getDate() === wibNow.getDate()
    }

    const isCurrentMonth = (tanggal: string): boolean => {
      if (tanggal.startsWith(monthPrefix)) return true
      const d = parseSaleDate(tanggal)
      if (!d) return false
      return d.getFullYear() === wibNow.getFullYear() && d.getMonth() === wibNow.getMonth()
    }

    const getDayOfMonth = (tanggal: string): number => {
      if (tanggal.startsWith(monthPrefix)) return parseInt(tanggal.split('-')[2])
      const d = parseSaleDate(tanggal)
      return d ? d.getDate() : 0
    }

    // Get all crews with their groups (PERF-04: don't load all sales)
    const crewWhere: Record<string, unknown> = {}
    if (groupId) crewWhere.groupId = groupId

    const crews = await db.crew.findMany({
      where: crewWhere,
      include: { group: true },
    })
    const crewIds = crews.map(c => c.id)

    // Fetch ALL sales for these crews in 2 queries (monthly + all-time) instead of N+1
    const [monthSales, allTimeSales] = crewIds.length > 0
      ? await Promise.all([
          db.sale.findMany({
            where: { crewId: { in: crewIds }, tanggal: { startsWith: monthPrefix } },
            select: { crewId: true, tanggal: true, settle: true, qty: true },
          }),
          db.sale.findMany({
            where: { crewId: { in: crewIds } },
            select: { crewId: true, tanggal: true, settle: true, qty: true },
          }),
        ])
      : [[], []]

    // Map crewId → sales for O(1) lookup
    const monthSalesByCrew = new Map<string, typeof monthSales>()
    const allSalesByCrew = new Map<string, typeof allTimeSales>()
    for (const s of monthSales) {
      if (!monthSalesByCrew.has(s.crewId!)) monthSalesByCrew.set(s.crewId!, [])
      monthSalesByCrew.get(s.crewId!)!.push(s)
    }
    for (const s of allTimeSales) {
      if (!allSalesByCrew.has(s.crewId!)) allSalesByCrew.set(s.crewId!, [])
      allSalesByCrew.get(s.crewId!)!.push(s)
    }

    // Calculate per-crew stats from pre-fetched data
    const crewStats = crews.map(crew => {
      const mSales = monthSalesByCrew.get(crew.id) || []
      const aSales = allSalesByCrew.get(crew.id) || []
      
      // Today's sales
      const todaySales = aSales.filter(s => isToday(s.tanggal))
      const todayTotal = todaySales.reduce((sum, s) => sum + s.settle, 0)
      const todayQty = todaySales.reduce((sum, s) => sum + s.qty, 0)
      
      // Weekly sales (filter by day range within current month)
      const weekSales = mSales.filter(s => {
        const d = getDayOfMonth(s.tanggal)
        return d >= weekStart && d <= weekEnd
      })
      const weekTotal = weekSales.reduce((sum, s) => sum + s.settle, 0)
      const weekQty = weekSales.reduce((sum, s) => sum + s.qty, 0)
      
      // Monthly sales totals
      const monthTotal = mSales.reduce((sum, s) => sum + s.settle, 0)
      const monthQty = mSales.reduce((sum, s) => sum + s.qty, 0)
      
      // All-time sales
      const allTimeTotal = aSales.reduce((sum, s) => sum + s.settle, 0)
      const allTimeQty = aSales.reduce((sum, s) => sum + s.qty, 0)

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
        transactionCount: aSales.length,
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

    const [yesterdayAgg, lastWeekAgg, lastMonthAgg] = await Promise.all([
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

    // Group/Zoning achievements — use pre-fetched sales data (PERF-04 fix)
    const groups = await db.group.findMany({
      include: { crews: { select: { id: true } } },
    })

    const groupAchievements = groups.map(group => {
      const crewSales = group.crews.flatMap(c => monthSalesByCrew.get(c.id) || [])
      const monthlyTotal = crewSales.reduce((s, sale) => s + sale.settle, 0)
      const weekSales = crewSales.filter(s => {
        const d = getDayOfMonth(s.tanggal)
        return d >= weekStart && d <= weekEnd
      })
      const weeklyTotal = weekSales.reduce((s, sale) => s + sale.settle, 0)
      
      let weekTargetPct: number
      switch (currentWeek) {
        case 1: weekTargetPct = group.week1Target; break
        case 2: weekTargetPct = group.week2Target; break
        case 3: weekTargetPct = group.week3Target; break
        case 4: weekTargetPct = group.week4Target; break
        default: weekTargetPct = 0
      }

      const monthlyAchievement = group.monthlyTarget > 0 
        ? Math.min((monthlyTotal / group.monthlyTarget) * 100, 100) 
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
        monthlyTotal,
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

    // Recent activity (last 10 sales)
    const recentSales = await db.sale.findMany({
      take: 10,
      include: {
        crew: {
          select: { name: true, photo: true, group: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

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
