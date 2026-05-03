import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────
// POST /api/claims/preview — Parse Excel & return preview rows (no DB write)
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File harus diisi' }, { status: 400 })
    }

    // File type validation
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!validTypes.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls)' },
        { status: 400 },
      )
    }

    // File size limit
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File terlalu besar (maksimal 4MB)' },
        { status: 400 },
      )
    }

    // Parse Excel — same logic as the upload endpoint
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1, defval: '' })

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'File kosong atau tidak dapat dibaca' }, { status: 400 })
    }

    // Find the header row
    const requiredColumns = ['Tanggal', 'Kode Extend', 'Settle', 'Qty']
    let headerRowIndex = -1
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      const rowValues = rawRows[i].map(v => String(v).trim())
      const hasAllRequired = requiredColumns.every(col => rowValues.includes(col))
      if (hasAllRequired) {
        headerRowIndex = i
        break
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json(
        { error: `Format file tidak valid. Pastikan file memiliki kolom: Tanggal, Kode Extend, Settle, Qty` },
        { status: 400 },
      )
    }

    // Build column index map
    const headerCols = rawRows[headerRowIndex].map(v => String(v).trim())
    const colIndex: Record<string, number> = {}
    for (let c = 0; c < headerCols.length; c++) {
      if (headerCols[c]) colIndex[headerCols[c]] = c
    }

    const getVal = (row: (string | number)[], colName: string): string | number => {
      const idx = colIndex[colName]
      return idx !== undefined ? row[idx] : ''
    }

    // Parse data rows for preview (max 20 rows)
    const dataRows = rawRows.slice(headerRowIndex + 1)
    const previewRows: {
      tanggal: string; kodeExtend: string; qty: number; settle: number
      brand: string; dept: string; modul: string; pembayaran: string; program: string
    }[] = []

    for (let i = 0; i < Math.min(dataRows.length, 20); i++) {
      const row = dataRows[i]
      const tanggal = String(getVal(row, 'Tanggal')).replace(/\s.*$/, '').substring(0, 10)
      const settle = Number(getVal(row, 'Settle')) || 0
      if (!tanggal && !String(getVal(row, 'Kode Extend'))) continue
      if (settle <= 0) continue

      previewRows.push({
        tanggal,
        kodeExtend: String(getVal(row, 'Kode Extend')),
        qty: Number(getVal(row, 'Qty')) || 0,
        settle,
        brand: String(getVal(row, 'Brand')),
        dept: String(getVal(row, 'Dept')),
        modul: String(getVal(row, 'Modul')),
        pembayaran: String(getVal(row, 'Pembayaran')),
        program: String(getVal(row, 'Program')),
      })
    }

    // Also count total rows for summary
    let totalDataRows = 0
    let totalQty = 0
    let totalSettle = 0
    for (const row of dataRows) {
      const tanggal = String(getVal(row, 'Tanggal')).replace(/\s.*$/, '').substring(0, 10)
      const settle = Number(getVal(row, 'Settle')) || 0
      if (!tanggal && !String(getVal(row, 'Kode Extend'))) continue
      if (settle <= 0) continue
      totalDataRows++
      totalQty += Number(getVal(row, 'Qty')) || 0
      totalSettle += settle
    }

    return NextResponse.json({
      previewRows,
      summary: {
        totalRows: totalDataRows,
        totalQty,
        totalSettle,
        sheetName,
      },
    })
  } catch (error) {
    console.error('Preview parse error:', error)
    return NextResponse.json({ error: 'Gagal membaca file Excel' }, { status: 500 })
  }
}
