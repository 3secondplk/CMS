import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/jobdesk/stats — Get jobdesk statistics
// PUBLIC — anyone can view stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const groupId = searchParams.get('groupId')

    const where: Record<string, unknown> = {}
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {}
      if (dateFrom) dateFilter.gte = dateFrom
      if (dateTo) dateFilter.lte = dateTo
      where.date = dateFilter
    }
    if (groupId) where.groupId = groupId

    const [total, pending, inProgress, completed, validated, urgent] = await Promise.all([
      db.jobdesk.count({ where }),
      db.jobdesk.count({ where: { ...where, status: 'pending' } }),
      db.jobdesk.count({ where: { ...where, status: 'in_progress' } }),
      db.jobdesk.count({ where: { ...where, status: 'completed' } }),
      db.jobdesk.count({ where: { ...where, validatedByAdmin: true } }),
      db.jobdesk.count({ where: { ...where, priority: 'urgent' } }),
    ])

    // Crew performance stats
    const crewStats = await db.jobdesk.groupBy({
      by: ['crewId'],
      where: { ...where, crewId: { not: null } },
      _count: { id: true },
    })

    // Get crew names for stats
    const crewIds = crewStats.map(s => s.crewId).filter(Boolean) as string[]
    const crews = crewIds.length > 0
      ? await db.crew.findMany({
          where: { id: { in: crewIds } },
          select: { id: true, name: true, photo: true },
        })
      : []

    const crewMap = new Map(crews.map(c => [c.id, c]))

    const crewPerformance = crewStats
      .map(s => ({
        crewId: s.crewId,
        crewName: crewMap.get(s.crewId!)?.name || 'Unknown',
        crewPhoto: crewMap.get(s.crewId!)?.photo || null,
        totalTasks: s._count.id,
      }))
      .sort((a, b) => b.totalTasks - a.totalTasks)

    return NextResponse.json({
      total, pending, inProgress, completed, validated, urgent,
      crewPerformance,
    })
  } catch (error) {
    console.error('Get jobdesk stats error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
