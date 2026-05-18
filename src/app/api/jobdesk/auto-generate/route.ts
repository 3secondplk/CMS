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

// POST /api/jobdesk/auto-generate — create jobdesks from active templates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const targetDate: string = body.date || getWIBToday()
    const groupId: string | undefined = body.groupId || undefined
    const crewName: string | undefined = body.crewName || undefined

    // Fetch active templates (optionally filtered by group)
    const templateWhere: Record<string, unknown> = { isActive: true }
    if (groupId) templateWhere.groupId = groupId

    const templates = await db.jobdeskTemplate.findMany({
      where: templateWhere,
      select: { id: true, title: true, description: true, priority: true, groupId: true, crewId: true },
    })

    if (templates.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, total: 0, message: 'Tidak ada template aktif' })
    }

    // Fetch existing jobdesks for this date to check duplicates
    const existingJobdesks = await db.jobdesk.findMany({
      where: { jobDate: targetDate },
      select: { title: true, groupId: true },
    })

    // Build a Set of composite keys for fast lookup
    const existingKeys = new Set(existingJobdesks.map(j => `${j.groupId}:${j.title}`))

    let created = 0
    let skipped = 0

    const newJobdesks = templates.filter(t => {
      const key = `${t.groupId}:${t.title}`
      if (existingKeys.has(key)) {
        skipped++
        return false
      }
      return true
    })

    // Batch create all new jobdesks
    if (newJobdesks.length > 0) {
      await db.jobdesk.createMany({
        data: newJobdesks.map(t => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          groupId: t.groupId,
          crewId: t.crewId,
          jobDate: targetDate,
          status: 'pending',
          verificationPercent: 0,
        })),
      })
      created = newJobdesks.length
    }

    const total = templates.length

    await logActivity('AUTO_GENERATE_JOBDESK', {
      description: `Auto-generate jobdesk untuk ${targetDate}: ${created} dibuat, ${skipped} dilewati`,
      details: { adminName: crewName || 'Crew', date: targetDate, groupId: groupId || 'all' },
    })

    return NextResponse.json({
      created,
      skipped,
      total,
      date: targetDate,
      message: `${created} jobdesk berhasil dibuat dari template`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal auto-generate jobdesk' }, { status: 500 })
  }
}
