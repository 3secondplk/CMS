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
        { name: { contains: search } },
        { employeeId: { contains: search } },
      ]
    }

    const crews = await db.crew.findMany({
      where,
      include: {
        group: true,
        sales: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const crewsWithStats = crews.map(crew => {
      const totalSales = crew.sales.reduce((sum, s) => sum + s.settle, 0)
      const totalQty = crew.sales.reduce((sum, s) => sum + s.qty, 0)
      const todayStr = new Date().toISOString().split('T')[0]
      const todaySales = crew.sales
        .filter(s => s.tanggal.startsWith(todayStr))
        .reduce((sum, s) => sum + s.settle, 0)

      return {
        ...crew,
        totalSales,
        totalQty,
        todaySales,
        transactionCount: crew.sales.length,
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

    const crew = await db.crew.create({
      data: {
        name,
        photo: photo || null,
        employeeId,
        groupId,
      },
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
  } catch (error) {
    console.error('Update crew error:', error)
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

    await db.crew.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete crew error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
