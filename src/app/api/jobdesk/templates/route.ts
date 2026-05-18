import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

// GET /api/jobdesk/templates — list active templates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')

  const where: Record<string, unknown> = { isActive: true }
  if (groupId) where.groupId = groupId

  const templates = await db.jobdeskTemplate.findMany({
    where,
    include: {
      group: { select: { id: true, name: true, logo: true } },
      crew: { select: { id: true, name: true, photo: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ templates })
}

// POST /api/jobdesk/templates — create a template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, priority, groupId, crewId } = body

    if (!title || !groupId) {
      return NextResponse.json({ error: 'Judul dan grup wajib diisi' }, { status: 400 })
    }

    // Validate group exists
    const group = await db.group.findUnique({ where: { id: groupId } })
    if (!group) return NextResponse.json({ error: 'Group tidak ditemukan' }, { status: 404 })

    // Validate crew if provided
    if (crewId) {
      const crew = await db.crew.findUnique({ where: { id: crewId } })
      if (!crew) return NextResponse.json({ error: 'Crew tidak ditemukan' }, { status: 404 })
    }

    const template = await db.jobdeskTemplate.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'medium',
        groupId,
        crewId: crewId || null,
      },
      include: {
        group: { select: { id: true, name: true, logo: true } },
        crew: { select: { id: true, name: true, photo: true } },
      },
    })

    await logActivity('CREATE_JOBDESK_TEMPLATE', { description: `Membuat template "${title}" di ${group.name}`, details: { adminName: 'Crew' } })

    return NextResponse.json({ template, message: 'Template berhasil dibuat' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal membuat template' }, { status: 500 })
  }
}

// PUT /api/jobdesk/templates — update a template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, description, priority, crewId, isActive } = body

    if (!id) return NextResponse.json({ error: 'ID template wajib' }, { status: 400 })

    const existing = await db.jobdeskTemplate.findUnique({ where: { id }, include: { group: true } })
    if (!existing) return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 })

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (priority !== undefined) updateData.priority = priority
    if (crewId !== undefined) updateData.crewId = crewId || null
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await db.jobdeskTemplate.update({
      where: { id },
      data: updateData,
      include: {
        group: { select: { id: true, name: true, logo: true } },
        crew: { select: { id: true, name: true, photo: true } },
      },
    })

    await logActivity('UPDATE_JOBDESK_TEMPLATE', { description: `Memperbarui template "${existing.title}"`, details: { adminName: 'Crew' } })

    return NextResponse.json({ template: updated, message: 'Template berhasil diperbarui' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui template' }, { status: 500 })
  }
}

// DELETE /api/jobdesk/templates — delete a template
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID template wajib' }, { status: 400 })

  const existing = await db.jobdeskTemplate.findUnique({ where: { id }, include: { group: true } })
  if (!existing) return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 })

  await db.jobdeskTemplate.delete({ where: { id } })

  await logActivity('DELETE_JOBDESK_TEMPLATE', { description: `Menghapus template "${existing.title}"`, details: { adminName: 'Crew' } })

  return NextResponse.json({ message: 'Template berhasil dihapus' })
}
