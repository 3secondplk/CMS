import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

// GET /api/jobdesk?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&groupId=xxx&crewId=xxx&status=xxx
// PUBLIC — anyone (crew/admin) can view jobdesks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const groupId = searchParams.get('groupId')
    const crewId = searchParams.get('crewId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    const where: Record<string, unknown> = {}

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {}
      if (dateFrom) dateFilter.gte = dateFrom
      if (dateTo) dateFilter.lte = dateTo
      where.date = dateFilter
    }

    if (groupId) where.groupId = groupId
    if (crewId) where.crewId = crewId
    if (status) where.status = status
    if (priority) where.priority = priority

    const jobdesks = await db.jobdesk.findMany({
      where,
      include: {
        group: { select: { id: true, name: true, logo: true } },
        crew: { select: { id: true, name: true, photo: true, employeeId: true } },
      },
      orderBy: [{ date: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
    })

    // Normalize: ensure status & priority always have valid values
    const validStatuses = ['pending', 'in_progress', 'completed']
    const validPriorities = ['regular', 'urgent']
    const normalized = jobdesks.map(j => ({
      ...j,
      status: validStatuses.includes(j.status) ? j.status : 'pending',
      priority: validPriorities.includes(j.priority) ? j.priority : 'regular',
    }))

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Get jobdesks error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// POST /api/jobdesk — Create new jobdesk
// PUBLIC — crew can add jobdesk without login (pilih crew dari dropdown)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, date, priority, status, groupId, crewId, order } = body

    if (!title || !date) {
      return NextResponse.json({ error: 'Judul dan tanggal harus diisi' }, { status: 400 })
    }

    // Get max order for the date
    const maxOrder = await db.jobdesk.findFirst({
      where: { date },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const jobdesk = await db.jobdesk.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        date,
        priority: priority || 'regular',
        status: status || 'pending',
        groupId: groupId || null,
        crewId: crewId || null,
        order: order ?? ((maxOrder?.order ?? -1) + 1),
      },
      include: {
        group: { select: { id: true, name: true, logo: true } },
        crew: { select: { id: true, name: true, photo: true, employeeId: true } },
      },
    })

    // Log activity (best-effort, skip if not authenticated)
    try {
      const auth = await requireAuth()
      if (auth) {
        logActivity('CREATE_JOBDESK', {
          description: `Tambah jobdesk: ${title}`,
          details: { title, date, priority, groupId, crewId },
        }).catch(() => {})
      }
    } catch { /* not authenticated — skip logging */ }

    return NextResponse.json(jobdesk, { status: 201 })
  } catch (error) {
    console.error('Create jobdesk error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// PUT /api/jobdesk — Update jobdesk (ADMIN ONLY: edit, status change, drag)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) return auth as NextResponse

    const body = await request.json()
    const { id, title, description, date, priority, status, groupId, crewId, order } = body

    if (!id) {
      return NextResponse.json({ error: 'ID jobdesk harus diisi' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (date !== undefined) updateData.date = date
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) updateData.status = status
    if (groupId !== undefined) updateData.groupId = groupId || null
    if (crewId !== undefined) updateData.crewId = crewId || null
    if (order !== undefined) updateData.order = order

    const jobdesk = await db.jobdesk.update({
      where: { id },
      data: updateData,
      include: {
        group: { select: { id: true, name: true, logo: true } },
        crew: { select: { id: true, name: true, photo: true, employeeId: true } },
      },
    })

    return NextResponse.json(jobdesk)
  } catch (error: unknown) {
    console.error('Update jobdesk error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Jobdesk tidak ditemukan' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// DELETE /api/jobdesk?id=xxx (ADMIN ONLY)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) return auth as NextResponse

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID jobdesk harus diisi' }, { status: 400 })
    }

    const existing = await db.jobdesk.findUnique({ where: { id } })

    if (existing) {
      logActivity('DELETE_JOBDESK', {
        description: `Hapus jobdesk: ${existing.title}`,
        details: { title: existing.title, date: existing.date },
      }).catch(() => {})
    }

    await db.jobdesk.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete jobdesk error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Jobdesk tidak ditemukan' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
