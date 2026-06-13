import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/jobdesk/status — Change jobdesk status (PUBLIC)
// Crew can update status of their own jobdesk tasks
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'ID dan status harus diisi' }, { status: 400 })
    }

    const validStatuses = ['pending', 'in_progress', 'completed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    // Verify record exists first
    const existing = await db.jobdesk.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Jobdesk tidak ditemukan' }, { status: 404 })
    }

    const jobdesk = await db.jobdesk.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: {
        group: { select: { id: true, name: true, logo: true } },
        crew: { select: { id: true, name: true, photo: true, employeeId: true } },
      },
    })

    // Normalize response
    const normalized = {
      ...jobdesk,
      status: validStatuses.includes(jobdesk.status) ? jobdesk.status : 'pending',
    }

    return NextResponse.json(normalized)
  } catch (error: unknown) {
    console.error('Update jobdesk status error:', error)
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code
      if (code === 'P2025') {
        return NextResponse.json({ error: 'Jobdesk tidak ditemukan' }, { status: 404 })
      }
      // Table or column might not exist
      if (code === 'P2021' || code === 'P2022') {
        return NextResponse.json({ error: 'Database belum siap. Jalankan: bun run db:push' }, { status: 503 })
      }
    }
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengubah status' }, { status: 500 })
  }
}