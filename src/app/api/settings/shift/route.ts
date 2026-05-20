import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_SHIFTS = JSON.stringify([
  { name: 'Shift 1', start: '08:00', end: '17:00' }
])

// GET /api/settings/shift — get shift settings
export async function GET() {
  try {
    let settings = await db.shiftSetting.findFirst()
    if (!settings) {
      settings = await db.shiftSetting.create({
        data: {
          shifts: DEFAULT_SHIFTS,
          timezone: 'Asia/Jakarta',
        },
      })
    }

    // Parse shifts JSON
    let shifts = []
    try {
      shifts = JSON.parse(settings.shifts)
    } catch {
      // Migrate old single-shift format to new multi-shift array
      shifts = [{ name: 'Shift 1', start: '08:00', end: '17:00' }]
    }

    return NextResponse.json({ settings: { ...settings, shifts } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengambil pengaturan shift' }, { status: 500 })
  }
}

// PUT /api/settings/shift — update shift settings (supports multi-shift)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { shifts, timezone } = body

    // Validate shifts array
    if (shifts && !Array.isArray(shifts)) {
      return NextResponse.json({ error: 'Format shift tidak valid' }, { status: 400 })
    }

    if (shifts) {
      // Validate each shift has required fields and valid time format
      const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/
      for (const shift of shifts) {
        if (!shift.name || !shift.start || !shift.end) {
          return NextResponse.json({ error: 'Setiap shift harus memiliki name, start, end' }, { status: 400 })
        }
        if (!timeRegex.test(shift.start)) {
          return NextResponse.json({ error: `Format jam "${shift.start}" tidak valid (HH:MM)` }, { status: 400 })
        }
        if (!timeRegex.test(shift.end)) {
          return NextResponse.json({ error: `Format jam "${shift.end}" tidak valid (HH:MM)` }, { status: 400 })
        }
      }
    }

    let settings = await db.shiftSetting.findFirst()
    if (settings) {
      settings = await db.shiftSetting.update({
        where: { id: settings.id },
        data: {
          ...(shifts && { shifts: JSON.stringify(shifts) }),
          ...(timezone && { timezone }),
        },
      })
    } else {
      settings = await db.shiftSetting.create({
        data: {
          shifts: JSON.stringify(shifts || [{ name: 'Shift 1', start: '08:00', end: '17:00' }]),
          timezone: timezone || 'Asia/Jakarta',
        },
      })
    }

    let parsedShifts = []
    try {
      parsedShifts = JSON.parse(settings.shifts)
    } catch {
      parsedShifts = [{ name: 'Shift 1', start: '08:00', end: '17:00' }]
    }

    return NextResponse.json({ settings: { ...settings, shifts: parsedShifts }, message: 'Pengaturan shift berhasil diperbarui' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui pengaturan' }, { status: 500 })
  }
}
