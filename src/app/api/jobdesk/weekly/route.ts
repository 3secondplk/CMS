import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/jobdesk/weekly — get weekly stats for the last 7 days
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')

  // Get WIB date
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const wib = new Date(utc + 7 * 3600000)

  // Calculate last 7 days (including today)
  const days: { date: string; dayLabel: string; dayShort: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(wib)
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    const dayFullNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    days.push({
      date: dateStr,
      dayLabel: dayFullNames[d.getDay()],
      dayShort: dayNames[d.getDay()],
    })
  }

  const startDate = days[0].date
  const endDate = days[6].date

  const where: Record<string, unknown> = {
    jobDate: { gte: startDate, lte: endDate },
  }
  if (groupId) where.groupId = groupId

  const jobdesks = await db.jobdesk.findMany({
    where,
    select: {
      id: true,
      jobDate: true,
      status: true,
      verificationPercent: true,
      priority: true,
    },
  })

  // Group by date
  const byDate: Record<string, typeof jobdesks> = {}
  for (const j of jobdesks) {
    if (!byDate[j.jobDate]) byDate[j.jobDate] = []
    byDate[j.jobDate].push(j)
  }

  // Build weekly data
  const weeklyData = days.map(day => {
    const items = byDate[day.date] || []
    const total = items.length
    const completed = items.filter(i => i.status === 'completed').length
    const inProgress = items.filter(i => i.status === 'in_progress').length
    const pending = total - completed - inProgress
    const avgVerification = total > 0
      ? Math.round(items.reduce((s, i) => s + i.verificationPercent, 0) / total)
      : 0
    const highPriority = items.filter(i => i.priority === 'high').length
    return {
      ...day,
      total,
      completed,
      inProgress,
      pending,
      avgVerification,
      highPriority,
    }
  })

  // Weekly totals
  const totalAll = weeklyData.reduce((s, d) => s + d.total, 0)
  const completedAll = weeklyData.reduce((s, d) => s + d.completed, 0)
  const avgRate = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0

  return NextResponse.json({
    weeklyData,
    totalAll,
    completedAll,
    avgRate,
    startDate,
    endDate,
  })
}
