import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

export const runtime = 'nodejs'

// GET /api/jobdesk/export — export jobdesks as CSV for a given date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const groupId = searchParams.get('groupId')

    if (!date) {
      return NextResponse.json({ error: 'Parameter date wajib diisi' }, { status: 400 })
    }

    // Build where clause
    const where: Record<string, unknown> = { jobDate: date }
    if (groupId) where.groupId = groupId

    // Fetch jobdesks with relations
    const jobdesks = await db.jobdesk.findMany({
      where,
      include: {
        group: { select: { name: true } },
        crew: { select: { name: true } },
        verifiedByAdmin: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (jobdesks.length === 0) {
      return NextResponse.json({ error: 'Tidak ada jobdesk untuk tanggal ini' }, { status: 404 })
    }

    // CSV headers in Indonesian
    const headers = ['No', 'Judul', 'Deskripsi', 'Prioritas', 'Status', 'Verifikasi(%)', 'Group', 'Crew', 'Catatan']

    // Priority labels
    const priorityLabels: Record<string, string> = {
      high: 'Tinggi',
      medium: 'Sedang',
      low: 'Rendah',
    }

    // Status labels
    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'Dalam Proses',
      completed: 'Selesai',
    }

    // Helper to escape CSV fields (wrap in quotes if contains comma/newline/quote)
    const escapeCSV = (value: string): string => {
      if (!value) return ''
      if (value.includes(',') || value.includes('\n') || value.includes('\r') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    // Build CSV rows
    const rows = jobdesks.map((jobdesk, index) => {
      return [
        index + 1,
        escapeCSV(jobdesk.title),
        escapeCSV(jobdesk.description || ''),
        priorityLabels[jobdesk.priority] || jobdesk.priority,
        statusLabels[jobdesk.status] || jobdesk.status,
        jobdesk.verificationPercent,
        escapeCSV(jobdesk.group?.name || ''),
        escapeCSV(jobdesk.crew?.name || ''),
        escapeCSV(jobdesk.notes || ''),
      ].join(',')
    })

    // Combine header + rows with BOM for proper Excel UTF-8 rendering
    const bom = '\uFEFF'
    const csv = bom + [headers.join(','), ...rows].join('\n')

    // Log the export activity
    await logActivity('EXPORT_JOBDESK', {
      description: `Mengekspor ${jobdesks.length} jobdesk untuk tanggal ${date}`,
      details: { date, groupId, count: jobdesks.length },
    })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=jobdesk-${date}.csv`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal mengekspor jobdesk'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
