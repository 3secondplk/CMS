import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/jobdesk/activity — get recent jobdesk activity log
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  // Get recent jobdesks sorted by updatedAt
  const recentItems = await db.jobdesk.findMany({
    take: limit,
    orderBy: { updatedAt: 'desc' },
    include: {
      group: { select: { id: true, name: true } },
      crew: { select: { id: true, name: true } },
      verifiedByAdmin: { select: { id: true, name: true } },
    },
  })

  // Build activity entries
  const activities = recentItems.map(item => {
    const isCompleted = item.status === 'completed'
    const wasUpdated = item.createdAt.toISOString() !== item.updatedAt.toISOString()

    let action = 'Dibuat'
    let actionIcon = 'create'
    if (isCompleted && wasUpdated) {
      action = 'Diselesaikan'
      actionIcon = 'complete'
    } else if (item.status === 'in_progress') {
      action = 'Diproses'
      actionIcon = 'progress'
    } else if (wasUpdated) {
      action = 'Diperbarui'
      actionIcon = 'update'
    }

    return {
      id: item.id,
      title: item.title,
      action,
      actionIcon,
      status: item.status,
      priority: item.priority,
      groupName: item.group.name,
      crewName: item.crew?.name || null,
      verificationPercent: item.verificationPercent,
      verifiedByAdmin: item.verifiedByAdmin?.name || null,
      updatedAt: item.updatedAt.toISOString(),
      jobDate: item.jobDate,
    }
  })

  return NextResponse.json({ activities })
}
