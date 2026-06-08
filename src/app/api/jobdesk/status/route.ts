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

    const jobdesk = await db.jobdesk.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: {
        group: { select: { id: true, name: true, logo: true } },
        crew: { select: { id: true, name: true, photo: true, employeeId: true } },
      },
    })

    return NextResponse.json(jobdesk)
  } catch (error: unknown) {
    console.error('Update jobdesk status error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Jobdesk tidak ditemukan' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
