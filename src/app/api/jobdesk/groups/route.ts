import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/jobdesk/groups — Public: fetch groups list for dropdown
// (no auth required — crew needs this to pick their zoning when adding jobdesk)
export async function GET() {
  try {
    const groups = await db.group.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, logo: true },
    })
    return NextResponse.json(groups)
  } catch (error) {
    console.error('Get jobdesk groups error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
