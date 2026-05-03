import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─────────────────────────────────────────────
// GET /api/activity — Fetch recent activity logs
// Query params: limit (default 10), action (optional filter)
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const actionFilter = searchParams.get('action') || ''

    const where: Record<string, unknown> = {}
    if (actionFilter) {
      where.action = actionFilter
    }

    const activities = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Get activity logs error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST /api/activity — Log a new activity
// Body: { action: string, description: string, crewName?: string, saleId?: string, metadata?: any }
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, description, crewName, saleId, metadata } = body

    if (!action || !description) {
      return NextResponse.json({ error: 'action dan description harus diisi' }, { status: 400 })
    }

    // Validate action type
    const validActions = ['CLAIM', 'UPLOAD', 'EDIT', 'DELETE', 'UNCLAIM', 'BULK_CLAIM', 'BULK_DELETE']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `action tidak valid: ${action}` }, { status: 400 })
    }

    const activity = await db.activityLog.create({
      data: {
        action,
        description,
        crewName: crewName || null,
        saleId: saleId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('Create activity log error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE /api/activity — Clean up old activity logs
// Query params: before (ISO date string) — delete logs older than this date
// ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const before = searchParams.get('before')

    if (!before) {
      return NextResponse.json({ error: 'parameter "before" harus diisi (ISO date)' }, { status: 400 })
    }

    const beforeDate = new Date(before)
    if (isNaN(beforeDate.getTime())) {
      return NextResponse.json({ error: 'format tanggal tidak valid' }, { status: 400 })
    }

    const result = await db.activityLog.deleteMany({
      where: { createdAt: { lt: beforeDate } },
    })

    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('Delete activity logs error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
