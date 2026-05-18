import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/jobdesk/history — get jobdesk history for a date range
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM format
  const groupId = searchParams.get('groupId')

  let startDate: string
  let endDate: string

  if (month) {
    // Parse YYYY-MM to get first and last day
    const [year, mon] = month.split('-').map(Number)
    const lastDay = new Date(year, mon, 0).getDate()
    startDate = `${year}-${String(mon).padStart(2, '0')}-01`
    endDate = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  } else {
    // Default: current month
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const wib = new Date(utc + 7 * 3600000)
    const year = wib.getFullYear()
    const mon = wib.getMonth() + 1
    const lastDay = new Date(year, mon, 0).getDate()
    startDate = `${year}-${String(mon).padStart(2, '0')}-01`
    endDate = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  }

  const where: Record<string, unknown> = {
    jobDate: { gte: startDate, lte: endDate },
  }
  if (groupId) where.groupId = groupId

  const jobdesks = await db.jobdesk.findMany({
    where,
    include: {
      group: { select: { id: true, name: true, logo: true } },
      crew: { select: { id: true, name: true, photo: true } },
      verifiedByAdmin: { select: { id: true, name: true } },
    },
    orderBy: [{ jobDate: 'desc' }, { createdAt: 'desc' }],
  })

  // Group by date for calendar heatmap
  const byDate: Record<string, typeof jobdesks> = {}
  for (const j of jobdesks) {
    if (!byDate[j.jobDate]) byDate[j.jobDate] = []
    byDate[j.jobDate].push(j)
  }

  // Build calendar data
  const calendarData = Object.entries(byDate).map(([date, items]) => {
    const total = items.length
    const completed = items.filter(i => i.status === 'completed').length
    const inProgress = items.filter(i => i.status === 'in_progress').length
    const avgVerification = total > 0
      ? Math.round(items.reduce((s, i) => s + i.verificationPercent, 0) / total)
      : 0
    return {
      date,
      total,
      completed,
      inProgress,
      pending: total - completed - inProgress,
      avgVerification,
      jobdesks: items,
    }
  })

  return NextResponse.json({
    startDate,
    endDate,
    calendarData,
    totalDays: calendarData.length,
  })
}
