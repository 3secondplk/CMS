import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const groups = await db.group.findMany({
      include: {
        crews: {
          include: {
            sales: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Calculate achievements for each group
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const wibNow = new Date(utc + 7 * 3600000)
    
    const currentMonth = wibNow.getMonth()
    const currentYear = wibNow.getFullYear()
    const dayOfMonth = wibNow.getDate()
    
    // Determine current week
    let currentWeek = 1
    if (dayOfMonth <= 7) currentWeek = 1
    else if (dayOfMonth <= 14) currentWeek = 2
    else if (dayOfMonth <= 21) currentWeek = 3
    else currentWeek = 4

    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

    const groupsWithStats = groups.map(group => {
      const allSales = group.crews.flatMap(c => c.sales)
      
      // Monthly total — filter by current month using monthPrefix
      const monthSales = allSales.filter(s => {
        // Handle ISO date strings (from xlsx) and DD/MM/YYYY format
        if (s.tanggal.startsWith(monthPrefix)) return true
        // Fallback: try parsing as Date for DD/MM/YYYY format
        const parsed = new Date(s.tanggal)
        if (isNaN(parsed.getTime())) return false
        return parsed.getFullYear() === currentYear && parsed.getMonth() === currentMonth
      })
      const monthlyTotal = monthSales.reduce((sum, s) => sum + s.settle, 0)
      const monthlyTarget = group.monthlyTarget
      const monthlyAchievement = monthlyTarget > 0 ? (monthlyTotal / monthlyTarget) * 100 : 0
      
      // Weekly total — also filter by current month to avoid cross-month contamination
      const weekStart = (currentWeek - 1) * 7 + 1
      const weekEnd = Math.min(currentWeek * 7, 31)
      const weekSales = monthSales.filter(s => {
        // Parse day from tanggal (ISO format: "YYYY-MM-DD..." or DD/MM/YYYY)
        if (s.tanggal.startsWith(monthPrefix)) {
          const day = parseInt(s.tanggal.split('-')[2])
          return day >= weekStart && day <= weekEnd
        }
        const parsed = new Date(s.tanggal)
        if (isNaN(parsed.getTime())) return false
        const day = parsed.getDate()
        return day >= weekStart && day <= weekEnd
      })
      const weeklyTotal = weekSales.reduce((sum, s) => sum + s.settle, 0)
      
      // Get current week target
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

    return NextResponse.json(groups)
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

    await db.group.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete group error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
