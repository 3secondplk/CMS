import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// PUT /api/jobdesk/reorder — Reorder jobdesks after drag & drop
// Body: { items: [{ id: string, order: number, date?: string }] }
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) return auth as NextResponse

    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Items harus berupa array' }, { status: 400 })
    }

    // Update each item's order and optionally date (for cross-date drag)
    await Promise.all(
      items.map((item: { id: string; order: number; date?: string }) =>
        db.jobdesk.update({
          where: { id: item.id },
          data: {
            order: item.order,
            ...(item.date ? { date: item.date } : {}),
          },
        })
      )
    )

    return NextResponse.json({ success: true, updated: items.length })
  } catch (error) {
    console.error('Reorder jobdesks error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
