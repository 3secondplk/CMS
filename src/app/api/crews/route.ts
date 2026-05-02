import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (groupId) where.groupId = groupId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ]
    }

    // PERF-02 fix: don't include sales, use aggregation instead
    const crews = await db.crew.findMany({
      where,
      include: { group: true },
      orderBy: { createdAt: 'asc' },
    })

    // Get WIB today for todaySales
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const wibNow = new Date(utc + 7 * 3600000)
    const todayStr = `${wibNow.getFullYear()}-${String(wibNow.getMonth() + 1).padStart(2, '0')}-${String(wibNow.getDate()).padStart(2, '0')}`

    const crewIds = crews.map(c => c.id)

    // Single aggregation query for all crew stats
    const allSales = crewIds.length > 0
      ? await db.sale.findMany({
          where: { crewId: { in: crewIds } },
          select: { crewId: true, settle: true, qty: true, tanggal: true },
        })
      : []

    // Map crewId → sales for O(1) lookup
    const salesByCrew = new Map<string, { settle: number; qty: number; tanggal: string }[]>()
    for (const s of allSales) {
      if (!salesByCrew.has(s.crewId!)) salesByCrew.set(s.crewId!, [])
      salesByCrew.get(s.crewId!)!.push(s)
    }

    const crewsWithStats = crews.map(crew => {
      const crewSales = salesByCrew.get(crew.id) || []
      const totalSales = crewSales.reduce((sum, s) => sum + s.settle, 0)
      const totalQty = crewSales.reduce((sum, s) => sum + s.qty, 0)
      const todaySales = crewSales
        .filter(s => s.tanggal.startsWith(todayStr))
        .reduce((sum, s) => sum + s.settle, 0)

      return {
        ...crew,
        totalSales,
        totalQty,
        todaySales,
        transactionCount: crewSales.length,
      }
    })

    return NextResponse.json(crewsWithStats)
  } catch (error) {
    console.error('Get crews error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, photo, employeeId, groupId } = body

    if (!name || !employeeId || !groupId) {
      return NextResponse.json({ error: 'Nama, ID Karyawan, dan Group harus diisi' }, { status: 400 })
    }

    // SEC-06: Input length validation
    if (name.length > 200) {
      return NextResponse.json({ error: 'Nama maksimal 200 karakter' }, { status: 400 })
    }
    if (employeeId.length > 50) {
      return NextResponse.json({ error: 'ID Karyawan maksimal 50 karakter' }, { status: 400 })
    }

    const crew = await db.crew.create({
      data: { name, photo: photo || null, employeeId, groupId },
      include: { group: true },
    })

    return NextResponse.json(crew, { status: 201 })
  } catch (error: unknown) {
    console.error('Create crew error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'ID Karyawan sudah terdaftar' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, photo, employeeId, groupId } = body

    if (!id) {
      return NextResponse.json({ error: 'ID crew harus diisi' }, { status: 400 })
    }

    // SEC-06: Input length validation
    if (name && name.length > 200) {
      return NextResponse.json({ error: 'Nama maksimal 200 karakter' }, { status: 400 })
    }
    if (employeeId && employeeId.length > 50) {
      return NextResponse.json({ error: 'ID Karyawan maksimal 50 karakter' }, { status: 400 })
    }

    const crew = await db.crew.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(photo !== undefined && { photo }),
        ...(employeeId && { employeeId }),
        ...(groupId && { groupId }),
      },
      include: { group: true },
    })

    return NextResponse.json(crew)
  } catch (error: unknown) {
    console.error('Update crew error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Crew tidak ditemukan' }, { status: 404 })
    }
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'ID Karyawan sudah terdaftar' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID crew harus diisi' }, { status: 400 })
    }

    await db.crew.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete crew error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Crew tidak ditemukan' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
