import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // ── WIB date calculation (before any queries) ──
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const wibNow = new Date(utc + 7 * 3600000)

    const currentMonth = wibNow.getMonth()
    const currentYear = wibNow.getFullYear()
    const dayOfMonth = wibNow.getDate()

    let currentWeek = 1
    if (dayOfMonth <= 7) currentWeek = 1
    else if (dayOfMonth <= 14) currentWeek = 2
    else if (dayOfMonth <= 21) currentWeek = 3
    else currentWeek = 4

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

    // ── Fetch groups with crew IDs only (PERF-03: don't load all sales) ──
    const groupsRaw = await db.group.findMany({
      include: {
        crews: { select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // ── Fetch monthly sales for all crews in a single query ──
    const allCrewIds = groupsRaw.flatMap(g => g.crews.map(c => c.id))
    const monthSalesData = allCrewIds.length > 0
      ? await db.sale.findMany({
          where: {
            crewId: { in: allCrewIds },
            tanggal: { startsWith: monthPrefix },
          },
          select: { crewId: true, tanggal: true, settle: true },
        })
      : []

    // Map crewId → sales for O(1) lookup
    const salesByCrew = new Map<string, { tanggal: string; settle: number }[]>()
    for (const s of monthSalesData) {
      if (!salesByCrew.has(s.crewId!)) salesByCrew.set(s.crewId!, [])
      salesByCrew.get(s.crewId!)!.push({ tanggal: s.tanggal, settle: s.settle })
    }

    // Week range (CORR-02: days 29-31 now included in week 4)
    const weekStart = (currentWeek - 1) * 7 + 1
    const weekEnd = currentWeek === 4 ? daysInMonth : Math.min(currentWeek * 7, daysInMonth)

    // ── Calculate achievements per group ──
    const groupsWithStats = groupsRaw.map(group => {
      const crewMonthSales = group.crews.flatMap(c => salesByCrew.get(c.id) || [])
      const monthlyTotal = crewMonthSales.reduce((sum, s) => sum + s.settle, 0)
      const monthlyTarget = group.monthlyTarget
      const monthlyAchievement = monthlyTarget > 0 ? (monthlyTotal / monthlyTarget) * 100 : 0

      const weekSales = crewMonthSales.filter(s => {
        const day = s.tanggal.startsWith(monthPrefix)
          ? parseInt(s.tanggal.split('-')[2])
          : (() => { const p = new Date(s.tanggal); return isNaN(p.getTime()) ? 0 : p.getDate() })()
        return day >= weekStart && day <= weekEnd
      })
      const weeklyTotal = weekSales.reduce((sum, s) => sum + s.settle, 0)

      let weekTarget: number
      switch (currentWeek) {
        case 1: weekTarget = group.week1Target; break
        case 2: weekTarget = group.week2Target; break
        case 3: weekTarget = group.week3Target; break
        case 4: weekTarget = group.week4Target; break
        default: weekTarget = 0
      }
      const weeklyAchievement = weekTarget > 0 ? (weeklyTotal / (monthlyTarget * weekTarget / 100)) * 100 : 0

      return {
        ...group,
        crewCount: group.crews.length,
        monthlyTotal,
        monthlyAchievement,
        weeklyTotal,
        weeklyAchievement,
        currentWeek,
        currentWeekTarget: weekTarget,
      }
    })

    return NextResponse.json(groupsWithStats)
  } catch (error) {
    console.error('Get groups error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, logo, monthlyTarget, week1Target, week2Target, week3Target, week4Target } = body

    if (!name) {
      return NextResponse.json({ error: 'Nama group harus diisi' }, { status: 400 })
    }

    const group = await db.group.create({
      data: {
        name,
        logo: logo || null,
        monthlyTarget: monthlyTarget || 0,
        week1Target: week1Target || 0,
        week2Target: week2Target || 0,
        week3Target: week3Target || 0,
        week4Target: week4Target || 0,
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, logo, monthlyTarget, week1Target, week2Target, week3Target, week4Target } = body

    if (!id) {
      return NextResponse.json({ error: 'ID group harus diisi' }, { status: 400 })
    }

    const group = await db.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(logo !== undefined && { logo }),
        ...(monthlyTarget !== undefined && { monthlyTarget }),
        ...(week1Target !== undefined && { week1Target }),
        ...(week2Target !== undefined && { week2Target }),
        ...(week3Target !== undefined && { week3Target }),
        ...(week4Target !== undefined && { week4Target }),
      },
    })

    return NextResponse.json(group)
  } catch (error) {
    console.error('Update group error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID group harus diisi' }, { status: 400 })
    }

    await db.group.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete group error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
