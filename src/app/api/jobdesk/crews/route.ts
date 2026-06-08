import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/jobdesk/crews?groupId=xxx — Public: fetch crews list for dropdown
// (no auth required — crew needs this to pick their name when adding jobdesk)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    const where: Record<string, unknown> = {}
    if (groupId) where.groupId = groupId

    const crews = await db.crew.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { group: { select: { id: true, name: true } } },
    })

    return NextResponse.json(crews)
  } catch (error) {
    console.error('Get jobdesk crews error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
