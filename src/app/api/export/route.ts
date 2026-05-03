import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) return auth as NextResponse
    const { searchParams } = new URL(request.url)
    const crewId = searchParams.get('crewId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const groupId = searchParams.get('groupId')

    const where: Record<string, unknown> = {}

    if (crewId) {
      where.crewId = crewId
    }

    if (groupId) {
      where.crew = {
        ...((where.crew as Record<string, unknown>) || {}),
        groupId,
      }
    }

    if (dateFrom || dateTo) {
      const tanggalFilter: Record<string, unknown> = {}
      if (dateFrom) {
        tanggalFilter.gte = dateFrom
      }
      if (dateTo) {
        // BUGFIX: use lt:nextDay to handle timestamps like "2026-05-03 09:00"
        const [y, m, d] = dateTo.split('-').map(Number)
        const nextDay = new Date(y, m - 1, d + 1)
        const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
        tanggalFilter.lt = nextDayStr
      }
      where.tanggal = tanggalFilter
    }

    const sales = await db.sale.findMany({
      where,
      include: {
        crew: {
          select: {
            name: true,
            group: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { tanggal: 'asc' },
      take: 50000, // SEC: Prevent OOM — max 50k rows exported
    })

    if (sales.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diekspor' }, { status: 404 })
    }

    // Build CSV content
    const header = 'No,Tanggal,Kode Extend,Brand,Qty,Settle,Crew,Group,Dept,Modul,Pembayaran'
    const rows = sales.map((sale, index) => {
      const no = index + 1
      const tanggal = sale.tanggal || ''
      const kodeExtend = sale.kodeExtend || ''
      const brand = sale.brand || ''
      const qty = sale.qty
      const settle = sale.settle
      const crew = sale.crew?.name || ''
      const group = sale.crew?.group?.name || ''
      const dept = sale.dept || ''
      const modul = sale.modul || ''
      const pembayaran = sale.pembayaran || ''

      return [
        no,
        escapeCsv(tanggal),
        escapeCsv(kodeExtend),
        escapeCsv(brand),
        qty,
        settle,
        escapeCsv(crew),
        escapeCsv(group),
        escapeCsv(dept),
        escapeCsv(modul),
        escapeCsv(pembayaran),
      ].join(',')
    })

    const csvContent = '\uFEFF' + [header, ...rows].join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="laporan-penjualan.csv"',
      },
    })
  } catch (error) {
    console.error('Export sales error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengekspor data' }, { status: 500 })
  }
}

function escapeCsv(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
