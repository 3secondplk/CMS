import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────
// GET /api/export/excel — Export claims data to .xlsx
// Supports filters: dateFrom, dateTo, crewId, program, claimed, search
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const crewId = searchParams.get('crewId') || ''
    const program = searchParams.get('program') || ''
    const claimed = searchParams.get('claimed') || ''
    const search = searchParams.get('search') || ''

    // Build Prisma where clause (same logic as /api/claims GET)
    const where: Record<string, any> = {}

    // Claimed filter
    if (claimed === 'true') {
      where.crewId = crewId ? crewId : { not: null }
    } else if (claimed === 'false') {
      where.crewId = { equals: null }
    } else if (crewId) {
      where.crewId = crewId
    }

    // Collect AND conditions
    const andConditions: Record<string, any>[] = []

    // Search
    if (search) {
      const searchConditions: Record<string, any>[] = [
        { kodeExtend: { contains: search } },
        { brand: { contains: search } },
        { dept: { contains: search } },
      ]
      if (claimed !== 'false') {
        searchConditions.push({ crew: { name: { contains: search } } })
      }
      andConditions.push({ OR: searchConditions })
    }

    // Date range
    if (dateFrom || dateTo) {
      const tanggalOrConditions: Record<string, any>[] = []
      if (dateFrom && dateTo) {
        if (dateFrom === dateTo) {
          tanggalOrConditions.push({ tanggal: dateFrom })
          tanggalOrConditions.push({ tanggal: { startsWith: dateFrom } })
        } else {
          tanggalOrConditions.push({ tanggal: { gte: dateFrom, lte: dateTo } })
          tanggalOrConditions.push({ tanggal: { startsWith: dateFrom } })
          tanggalOrConditions.push({ tanggal: { startsWith: dateTo } })
        }
      } else if (dateFrom) {
        tanggalOrConditions.push({ tanggal: { gte: dateFrom } })
        tanggalOrConditions.push({ tanggal: { startsWith: dateFrom } })
      } else {
        tanggalOrConditions.push({ tanggal: { lte: dateTo } })
        tanggalOrConditions.push({ tanggal: { startsWith: dateTo } })
      }
      andConditions.push({ OR: tanggalOrConditions })
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    // Program filter
    if (program) {
      where.program = program
    }

    // Fetch ALL matching sales (no pagination for export)
    const sales = await db.sale.findMany({
      where,
      include: {
        crew: {
          select: { name: true, employeeId: true, group: { select: { name: true } } },
        },
      },
      orderBy: { tanggal: 'desc' },
    })

    if (sales.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diekspor' }, { status: 404 })
    }

    // ── Build workbook with formatting ──
    const workbook = XLSX.utils.book_new()

    // ── Sheet 1: Laporan Penjualan ──
    const headerRow = [
      'No',
      'Tanggal',
      'ID Penjualan',
      'Kode Extend',
      'Brand',
      'Dept',
      'Modul',
      'Ukuran',
      'Qty',
      'HJP',
      'Netto',
      'Diskon (%)',
      'Diskon Rp',
      'Potongan',
      'Potongan V',
      'Settle',
      'Pembayaran',
      'Program',
      'Channel Stock',
      'Crew',
      'Group',
      'Status Retention',
      'Retention Code',
      'Claimed At',
    ]

    const dataRows = sales.map((sale, index) => [
      index + 1,
      sale.tanggal || '',
      sale.idPenjualan || '',
      sale.kodeExtend || '',
      sale.brand || '',
      sale.dept || '',
      sale.modul || '',
      sale.ukuran || '',
      sale.qty,
      sale.hjp,
      sale.netto,
      sale.diskon,
      sale.diskonRp,
      sale.potongan,
      sale.potonganV,
      sale.settle,
      sale.pembayaran || '',
      sale.program || '',
      sale.channelStock || '',
      sale.crew?.name || '',
      sale.crew?.group?.name || '',
      sale.statusRetention || '',
      sale.retentionCode || '',
      sale.claimedAt ? new Date(sale.claimedAt).toLocaleString('id-ID') : '',
    ])

    // Summary row
    const totalQty = sales.reduce((s, r) => s + r.qty, 0)
    const totalSettle = sales.reduce((s, r) => s + r.settle, 0)
    const claimedCount = sales.filter(s => s.crewId).length
    const unclaimedCount = sales.length - claimedCount

    const summaryRows = [
      [],
      ['RINGKASAN'],
      ['Total Data', sales.length],
      ['Total Qty', totalQty],
      ['Total Settle', totalSettle],
      ['Sudah Claim', claimedCount],
      ['Belum Claim', unclaimedCount],
    ]

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows, ...summaryRows])

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },   // No
      { wch: 12 },  // Tanggal
      { wch: 16 },  // ID Penjualan
      { wch: 18 },  // Kode Extend
      { wch: 20 },  // Brand
      { wch: 12 },  // Dept
      { wch: 12 },  // Modul
      { wch: 10 },  // Ukuran
      { wch: 6 },   // Qty
      { wch: 14 },  // HJP
      { wch: 14 },  // Netto
      { wch: 10 },  // Diskon
      { wch: 14 },  // Diskon Rp
      { wch: 12 },  // Potongan
      { wch: 12 },  // Potongan V
      { wch: 16 },  // Settle
      { wch: 14 },  // Pembayaran
      { wch: 14 },  // Program
      { wch: 14 },  // Channel Stock
      { wch: 20 },  // Crew
      { wch: 20 },  // Group
      { wch: 16 },  // Status Retention
      { wch: 16 },  // Retention Code
      { wch: 20 },  // Claimed At
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan')

    // ── Sheet 2: Ringkasan per Dept ──
    const deptMap = new Map<string, { qty: number; settle: number; count: number }>()
    for (const sale of sales) {
      const dept = sale.dept || 'Tidak Ada Dept'
      const existing = deptMap.get(dept) || { qty: 0, settle: 0, count: 0 }
      existing.qty += sale.qty
      existing.settle += sale.settle
      existing.count += 1
      deptMap.set(dept, existing)
    }

    const deptRows = [
      ['Dept', 'Jumlah Data', 'Total Qty', 'Total Settle'],
      ...Array.from(deptMap.entries())
        .sort((a, b) => b[1].settle - a[1].settle)
        .map(([dept, stats]) => [dept, stats.count, stats.qty, stats.settle]),
      ['', '', 'Total', totalSettle],
    ]

    const deptSheet = XLSX.utils.aoa_to_sheet(deptRows)
    deptSheet['!cols'] = [
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(workbook, deptSheet, 'Ringkasan Dept')

    // ── Sheet 3: Ringkasan per Crew ──
    const crewMap = new Map<string, { name: string; group: string; qty: number; settle: number; count: number }>()
    for (const sale of sales) {
      const crewName = sale.crew?.name || 'Belum Claim'
      const groupName = sale.crew?.group?.name || '-'
      const existing = crewMap.get(crewName) || { name: crewName, group: groupName, qty: 0, settle: 0, count: 0 }
      existing.qty += sale.qty
      existing.settle += sale.settle
      existing.count += 1
      crewMap.set(crewName, existing)
    }

    const crewRows = [
      ['Crew', 'Group', 'Jumlah Data', 'Total Qty', 'Total Settle'],
      ...Array.from(crewMap.values())
        .sort((a, b) => b.settle - a.settle)
        .map(c => [c.name, c.group, c.count, c.qty, c.settle]),
    ]

    const crewSheet = XLSX.utils.aoa_to_sheet(crewRows)
    crewSheet['!cols'] = [
      { wch: 22 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(workbook, crewSheet, 'Ringkasan Crew')

    // Generate xlsx buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Generate filename with date
    const today = new Date()
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const filename = `laporan-penjualan-${dateStr}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export Excel error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengekspor data' }, { status: 500 })
  }
}
