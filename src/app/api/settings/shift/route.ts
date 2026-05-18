import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings/shift — get shift settings
export async function GET() {
  let settings = await db.shiftSetting.findFirst()
  if (!settings) {
    // Create default settings
    settings = await db.shiftSetting.create({
      data: {
        shiftName: 'Default Shift',
        shiftStart: '08:00',
        shiftEnd: '17:00',
        timezone: 'Asia/Jakarta',
      },
    })
  }

  return NextResponse.json({ settings })
}

// PUT /api/settings/shift — update shift settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { shiftName, shiftStart, shiftEnd } = body

    // Validate time format HH:MM
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/
    if (shiftStart && !timeRegex.test(shiftStart)) {
      return NextResponse.json({ error: 'Format jam tidak valid (HH:MM)' }, { status: 400 })
    }
    if (shiftEnd && !timeRegex.test(shiftEnd)) {
      return NextResponse.json({ error: 'Format jam tidak valid (HH:MM)' }, { status: 400 })
    }

    let settings = await db.shiftSetting.findFirst()
    if (settings) {
      settings = await db.shiftSetting.update({
        where: { id: settings.id },
        data: {
          ...(shiftName && { shiftName }),
          ...(shiftStart && { shiftStart }),
          ...(shiftEnd && { shiftEnd }),
        },
      })
    } else {
      settings = await db.shiftSetting.create({
        data: {
          shiftName: shiftName || 'Default Shift',
          shiftStart: shiftStart || '08:00',
          shiftEnd: shiftEnd || '17:00',
        },
      })
    }

    return NextResponse.json({ settings, message: 'Pengaturan shift berhasil diperbarui' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui pengaturan' }, { status: 500 })
  }
}
