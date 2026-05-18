import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

// POST /api/jobdesk/bulk — bulk update status or delete jobdesks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, status, verificationPercent, action } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs wajib berupa array tidak kosong' }, { status: 400 })
    }

    if (!action || !['update_status', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Action wajib: update_status atau delete' }, { status: 400 })
    }

    if (action === 'update_status' && !status) {
      return NextResponse.json({ error: 'Status wajib diisi untuk update_status' }, { status: 400 })
    }

    if (action === 'update_status' && !['pending', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid: pending, in_progress, atau completed' }, { status: 400 })
    }

    // Validate all IDs exist
    const existingJobdesks = await db.jobdesk.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true, crew: { select: { name: true } } },
    })

    const foundIds = existingJobdesks.map(j => j.id)
    const missingIds = ids.filter((id: string) => !foundIds.includes(id))
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `${missingIds.length} jobdesk tidak ditemukan` },
        { status: 404 }
      )
    }

    if (action === 'delete') {
      // Bulk delete
      const result = await db.jobdesk.deleteMany({
        where: { id: { in: ids } },
      })

      await logActivity('BULK_DELETE_JOBDESK', {
        description: `Menghapus ${result.count} jobdesk secara massal`,
        details: { count: result.count, ids },
      })

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `${result.count} jobdesk berhasil dihapus`,
      })
    }

    // action === 'update_status'
    const updateData: Record<string, unknown> = { status }

    if (status === 'completed') {
      updateData.completedAt = new Date()
    } else {
      // Clear completedAt when moving away from completed
      updateData.completedAt = null
    }

    if (verificationPercent !== undefined && verificationPercent !== null) {
      const clampedPercent = Math.max(0, Math.min(100, Number(verificationPercent)))
      updateData.verificationPercent = clampedPercent
      updateData.verifiedByAdminId = null
    }

    const result = await db.jobdesk.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    })

    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'Dalam Proses',
      completed: 'Selesai',
    }

    await logActivity('BULK_UPDATE_JOBDESK', {
      description: `Mengubah status ${result.count} jobdesk menjadi ${statusLabels[status] || status}`,
      details: {
        count: result.count,
        status,
        verificationPercent,
        ids,
      },
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} jobdesk berhasil diperbarui`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal melakukan operasi bulk'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
