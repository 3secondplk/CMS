import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

// WIB date helper (server-side)
function getWIBToday(): string {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const wib = new Date(utc + 7 * 3600000)
  return `${wib.getFullYear()}-${String(wib.getMonth() + 1).padStart(2, '0')}-${String(wib.getDate()).padStart(2, '0')}`
}

// GET /api/jobdesk — list today's jobdesks (or by date/group filter)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || getWIBToday()
  const groupId = searchParams.get('groupId')

  const where: Record<string, unknown> = { jobDate: date }
  if (groupId) where.groupId = groupId

  const jobdesks = await db.jobdesk.findMany({
    where,
    include: {
      group: { select: { id: true, name: true, logo: true } },
      crew: { select: { id: true, name: true, photo: true, employeeId: true } },
      verifiedByAdmin: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get summary stats
  const allGroups = await db.group.findMany({
    select: {
      id: true, name: true, logo: true,
      crews: { select: { id: true, name: true, photo: true } },
      _count: { select: { jobdesks: { where: { jobDate: date } } } },
    },
  })

  // Per-group stats — single aggregated query (eliminates N+1)
  const allJobdeskStats = await db.jobdesk.findMany({
    where: { jobDate: date },
    select: { groupId: true, status: true, verificationPercent: true },
  })

  const statsByGroup = new Map<string, { total: number; completed: number; inProgress: number; pending: number; verificationSum: number }>()
  for (const j of allJobdeskStats) {
    const s = statsByGroup.get(j.groupId) || { total: 0, completed: 0, inProgress: 0, pending: 0, verificationSum: 0 }
    s.total++
    if (j.status === 'completed') s.completed++
    else if (j.status === 'in_progress') s.inProgress++
    else s.pending++
    s.verificationSum += j.verificationPercent
    statsByGroup.set(j.groupId, s)
  }

  const groupStats = allGroups.map((g) => {
    const s = statsByGroup.get(g.id)
    const total = s?.total || 0
    return {
      groupId: g.id,
      groupName: g.name,
      groupLogo: g.logo,
      crewCount: g.crews.length,
      crews: g.crews,
      total,
      completed: s?.completed || 0,
      inProgress: s?.inProgress || 0,
      pending: s?.pending || 0,
      avgVerification: total > 0 ? Math.round((s?.verificationSum || 0) / total) : 0,
    }
  })

  // Overall summary
  const totalJobdesks = jobdesks.length
  const completedCount = jobdesks.filter(j => j.status === 'completed').length
  const pendingCount = jobdesks.filter(j => j.status === 'pending').length
  const inProgressCount = jobdesks.filter(j => j.status === 'in_progress').length
  const avgVerification = totalJobdesks > 0
    ? Math.round(jobdesks.reduce((s, j) => s + j.verificationPercent, 0) / totalJobdesks)
    : 0

  return NextResponse.json({
    jobdesks,
    summary: {
      total: totalJobdesks,
      completed: completedCount,
      pending: pendingCount,
      inProgress: inProgressCount,
      avgVerification,
    },
    groupStats,
    date,
  })
}

// POST /api/jobdesk — create new jobdesk
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { groupId, crewId, title, description, priority, crewName } = body

    if (!groupId || !title) {
      return NextResponse.json({ error: 'Group dan judul wajib diisi' }, { status: 400 })
    }

    // Validate group exists
    const group = await db.group.findUnique({ where: { id: groupId } })
    if (!group) return NextResponse.json({ error: 'Group tidak ditemukan' }, { status: 404 })

    // Validate crew if provided
    if (crewId) {
      const crew = await db.crew.findUnique({ where: { id: crewId } })
      if (!crew) return NextResponse.json({ error: 'Crew tidak ditemukan' }, { status: 404 })
    }

    const jobdesk = await db.jobdesk.create({
      data: {
        groupId,
        crewId: crewId || null,
        title,
        description: description || null,
        priority: priority || 'medium',
        jobDate: getWIBToday(),
      },
      include: {
        group: { select: { id: true, name: true, logo: true } },
        crew: { select: { id: true, name: true, photo: true } },
      },
    })

    await logActivity('CREATE_JOBDESK', `Membuat jobdesk "${title}" di ${group.name}`, null, null, JSON.stringify({ adminName: crewName || 'Crew' }))

    return NextResponse.json({ jobdesk, message: 'Jobdesk berhasil dibuat' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal membuat jobdesk' }, { status: 500 })
  }
}

// PUT /api/jobdesk — update jobdesk (status, verification, notes)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, crewId, title, description, priority, verificationPercent, notes, crewName } = body

    if (!id) return NextResponse.json({ error: 'ID jobdesk wajib' }, { status: 400 })

    const existing = await db.jobdesk.findUnique({ where: { id }, include: { group: true, crew: true } })
    if (!existing) return NextResponse.json({ error: 'Jobdesk tidak ditemukan' }, { status: 404 })

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) {
      updateData.status = status
      if (status === 'completed') updateData.completedAt = new Date()
    }
    if (crewId !== undefined) updateData.crewId = crewId || null
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (priority !== undefined) updateData.priority = priority
    if (verificationPercent !== undefined) {
      updateData.verificationPercent = Math.max(0, Math.min(100, verificationPercent))
      updateData.verifiedByAdminId = null
    }
    if (notes !== undefined) updateData.notes = notes || null

    const updated = await db.jobdesk.update({
      where: { id },
      data: updateData,
      include: {
        group: { select: { id: true, name: true, logo: true } },
        crew: { select: { id: true, name: true, photo: true, employeeId: true } },
        verifiedByAdmin: { select: { id: true, name: true } },
      },
    })

    const actionDesc = status === 'completed' ? 'Menyelesaikan' : 'Memperbarui'
    await logActivity('UPDATE_JOBDESK', `${actionDesc} jobdesk "${existing.title}"`, existing.crew?.name, null, JSON.stringify({ adminName: crewName || existing.crew?.name || 'Crew' }))

    return NextResponse.json({ jobdesk: updated, message: 'Jobdesk berhasil diperbarui' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui jobdesk' }, { status: 500 })
  }
}

// DELETE /api/jobdesk — delete a jobdesk
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID jobdesk wajib' }, { status: 400 })

  const existing = await db.jobdesk.findUnique({ where: { id }, include: { group: true, crew: true } })
  if (!existing) return NextResponse.json({ error: 'Jobdesk tidak ditemukan' }, { status: 404 })

  await db.jobdesk.delete({ where: { id } })

  await logActivity('DELETE_JOBDESK', `Menghapus jobdesk "${existing.title}"`, existing.crew?.name, null, JSON.stringify({ adminName: existing.crew?.name || 'Crew' }))

  return NextResponse.json({ message: 'Jobdesk berhasil dihapus' })
}
