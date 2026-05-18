import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/jobdesk/crew-trend — crew performance trend for last 7 days
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')

  // Get WIB date
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const wib = new Date(utc + 7 * 3600000)

  // Calculate last 7 days
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(wib)
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push(dateStr)
  }

  const startDate = days[0]
  const endDate = days[6]

  const where: Record<string, unknown> = {
    jobDate: { gte: startDate, lte: endDate },
    crewId: { not: null },
  }
  if (groupId) where.groupId = groupId

  const jobdesks = await db.jobdesk.findMany({
    where,
    select: {
      id: true,
      jobDate: true,
      status: true,
      verificationPercent: true,
      crewId: true,
      crew: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  // Group by crewId -> date
  const crewMap = new Map<string, Map<string, typeof jobdesks>>()
  for (const j of jobdesks) {
    if (!j.crewId || !j.crew) continue
    if (!crewMap.has(j.crewId)) crewMap.set(j.crewId, new Map())
    const dateMap = crewMap.get(j.crewId)!
    if (!dateMap.has(j.jobDate)) dateMap.set(j.jobDate, [])
    dateMap.get(j.jobDate)!.push(j)
  }

  // Build crew trends
  const crewTrends = Array.from(crewMap.entries()).map(([crewId, dateMap]) => {
    const crew = jobdesks.find(j => j.crewId === crewId)?.crew
    const data = days.map(date => {
      const items = dateMap.get(date) || []
      const total = items.length
      const completed = items.filter(i => i.status === 'completed').length
      const avgVerification = total > 0
        ? Math.round(items.reduce((s, i) => s + i.verificationPercent, 0) / total)
        : 0
      return { date, completed, total, avgVerification }
    })
    return {
      crewId,
      crewName: crew?.name || 'Unknown',
      data,
    }
  })

  return NextResponse.json({ crewTrends })
}
