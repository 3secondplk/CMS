import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

// PUT /api/jobdesk/validate — Admin validates (approves) a jobdesk as complete
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) return auth as NextResponse

    const body = await request.json()
    const { id, validated } = body

    if (!id) {
      return NextResponse.json({ error: 'ID jobdesk harus diisi' }, { status: 400 })
    }

    const jobdesk = await db.jobdesk.update({
      where: { id },
      data: {
        validatedByAdmin: validated !== false,
        validatedBy: validated !== false ? auth.name : null,
        validatedAt: validated !== false ? new Date() : null,
        status: validated !== false ? 'completed' : 'pending',
      },
      include: {
        group: { select: { id: true, name: true, logo: true } },
        crew: { select: { id: true, name: true, photo: true, employeeId: true } },
      },
    })

    // Normalize response
    const validStatuses = ['pending', 'in_progress', 'completed']
    const normalized = {
      ...jobdesk,
      status: validStatuses.includes(jobdesk.status) ? jobdesk.status : 'pending',
    }

    // Log activity
    logActivity(validated !== false ? 'VALIDATE_JOBDESK' : 'UNVALIDATE_JOBDESK', {
      description: `${validated !== false ? 'Validasi' : 'Batalkan validasi'} jobdesk: ${jobdesk.title}`,
      details: { title: jobdesk.title, date: jobdesk.date },
    }).catch(() => {})

    return NextResponse.json(normalized)
  } catch (error: unknown) {
    console.error('Validate jobdesk error:', error)
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code
      if (code === 'P2025') {
        return NextResponse.json({ error: 'Jobdesk tidak ditemukan' }, { status: 404 })
      }
      if (code === 'P2021' || code === 'P2022') {
        return NextResponse.json({ error: 'Database belum siap. Jalankan: bun run db:push' }, { status: 503 })
      }
    }
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}