import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import * as XLSX from 'xlsx'

// Helper: get today's date in WIB timezone (YYYY-MM-DD)
function getWIBToday() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const wib = new Date(utc + 7 * 3600000)
  return `${wib.getFullYear()}-${String(wib.getMonth() + 1).padStart(2, '0')}-${String(wib.getDate()).padStart(2, '0')}`
}

// Helper: log activity to ActivityLog (fire-and-forget)
async function logActivity(action: string, description: string, crewName?: string, saleId?: string, metadata?: Record<string, unknown>) {
  try {
    await db.activityLog.create({
      data: {
        action,
        description,
        crewName: crewName || null,
        saleId: saleId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })
  } catch {
    // Silently fail — activity logging should never break main operations
  }
}

// Helper: format Rupiah short (e.g. "Rp 2.5jt")
function fmtRpShort(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(1)}rb`
  return `Rp ${n}`
}

// ─────────────────────────────────────────────
// POST /api/claims — Upload Excel & Import as unclaimed sales
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

    // SEC-07: File size limit (Vercel Hobby has 4.5MB body limit)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File terlalu besar (maksimal 4MB untuk Vercel free tier)' },
        { status: 400 },
      )
    }

    // Parse Excel — supports two formats:
    // Format A: Row 0 = title "Laporan Penjualan", Row 1 = headers, Row 2+ = data
    // Format B: Row 0 = headers, Row 1+ = data (no title row)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Use header:1 mode to get raw arrays — this lets us detect the header row properly
    const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1, defval: '' })

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'File kosong atau tidak dapat dibaca' }, { status: 400 })
    }

    // Find the header row by looking for required column names
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

    // Extract column names from the header row
    const headerCols = rawRows[headerRowIndex].map(v => String(v).trim())
    // Build a column index map
    const colIndex: Record<string, number> = {}
    for (let c = 0; c < headerCols.length; c++) {
      if (headerCols[c]) colIndex[headerCols[c]] = c
    }

    // Helper to get cell value by column name
    const getVal = (row: (string | number)[], colName: string): string | number => {
      const idx = colIndex[colName]
      return idx !== undefined ? row[idx] : ''
    }

    // Data rows start after the header row
    const dataRows = rawRows.slice(headerRowIndex + 1).map(row => {
      const obj: Record<string, unknown> = {}
      for (const [colName, idx] of Object.entries(colIndex)) {
        obj[colName] = row[idx] !== undefined ? row[idx] : ''
      }
      return obj
    })

    const uniqueProducts = new Set<string>()
    let totalQty = 0
    let totalSettle = 0

    // Build insert payloads — all 20 Excel columns
    const salesData: {
      tanggal: string; idPenjualan: string; statusRetention: string; retentionCode: string
      kodeExtend: string; brand: string; dept: string; modul: string; ukuran: string
      qty: number; hjp: number; netto: number; diskon: number; diskonRp: number
      potongan: number; potonganV: number; settle: number
      pembayaran: string; program: string; channelStock: string
    }[] = []

    for (const row of dataRows) {
      // Normalize tanggal: strip time portion, keep only date (YYYY-MM-DD)
      const rawTanggal = String(row['Tanggal'] || '').trim()
      const tanggal = rawTanggal.replace(/\s.*$/, '').substring(0, 10) || rawTanggal.substring(0, 10)
      const idPenjualan = String(row['ID Penjualan'] || '')
      const statusRetention = String(row['Status Retention'] || '')
      const retentionCode = String(row['Retention Code'] || '')
      const kodeExtend = String(row['Kode Extend'] || '')
      const brand = String(row['Brand'] || '')
      const dept = String(row['Dept'] || '')
      const modul = String(row['Modul'] || '')
      const ukuran = String(row['Ukuran'] || '')
      const qty = Number(row['Qty']) || 0
      const hjp = Number(row['HJP']) || Number(row['Hjp']) || Number(row['hjp']) || 0
      const netto = Number(row['Netto']) || 0
      const diskon = Number(row['Diskon']) || 0
      const diskonRp = Number(row['Diskon Rp']) || 0
      const potongan = Number(row['Potongan,']) || Number(row['Potongan']) || 0
      const potonganV = Number(row['Potongan V']) || 0
      const settle = Number(row['Settle']) || 0
      const pembayaran = String(row['Pembayaran'] || '')
      const program = String(row['Program'] || '')
      const channelStock = String(row['Channel Stock'] || '')

      // Skip completely empty rows
      if (!tanggal && !kodeExtend) continue

      // Skip rows where Settle is 0 or empty
      if (!settle || settle <= 0) continue

      salesData.push({ tanggal, idPenjualan, statusRetention, retentionCode, kodeExtend, brand, dept, modul, ukuran, qty, hjp, netto, diskon, diskonRp, potongan, potonganV, settle, pembayaran, program, channelStock })
      if (kodeExtend) uniqueProducts.add(kodeExtend)
      totalQty += qty
      totalSettle += settle
    }

    if (salesData.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data penjualan valid dalam file (Settle harus > 0)' },
        { status: 400 },
      )
    }

    // ── Cross-DB deduplication (DEDUP v5) ──
    // idPenjualan = transaction/receipt ID from POS system
    // Multiple items in the same transaction share the same idPenjualan
    // Same product can appear multiple times (customer buys 3x of same item)
    // → Dedup at TRANSACTION level: if idPenjualan exists in DB, skip ALL rows for that transaction
    // → NO in-file dedup: all rows from Excel are legitimate, even if they look identical
    let newSalesData: typeof salesData = []
    let duplicateCount = 0

    // Step 1: Separate rows with and without idPenjualan
    const withIdPenjualan = salesData.filter(s => s.idPenjualan)
    const withoutIdPenjualan = salesData.filter(s => !s.idPenjualan)

    // Step 2: For rows WITH idPenjualan → dedup at transaction level
    // idPenjualan is the receipt/transaction ID — same for ALL items in one struk
    // If this transaction is already in DB, skip ALL its rows
    const existingIdPenjualans = new Set<string>()
    if (withIdPenjualan.length > 0) {
      const uniqueIds = [...new Set(withIdPenjualan.map(s => s.idPenjualan))]
      const CHUNK_SIZE = 100
      for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
        const chunk = uniqueIds.slice(i, i + CHUNK_SIZE)
        const results = await db.sale.findMany({
          where: { idPenjualan: { in: chunk } },
          select: { idPenjualan: true },
        })
        for (const r of results) {
          if (r.idPenjualan) existingIdPenjualans.add(r.idPenjualan)
        }
      }
      // Keep only rows whose idPenjualan does NOT exist in DB
      const idPenjualanKeep = withIdPenjualan.filter(s => !existingIdPenjualans.has(s.idPenjualan))
      duplicateCount += withIdPenjualan.length - idPenjualanKeep.length
      newSalesData.push(...idPenjualanKeep)
    }

    // Step 3: For rows WITHOUT idPenjualan → count-based dedup using (tanggal, kodeExtend)
    // Count occurrences of each (tanggal, kodeExtend) in import
    // Compare with DB count → only import the excess
    if (withoutIdPenjualan.length > 0) {
      const importCounts = new Map<string, number>()
      for (const s of withoutIdPenjualan) {
        const key = `${s.tanggal}|||${s.kodeExtend}`
        importCounts.set(key, (importCounts.get(key) || 0) + 1)
      }

      // Get DB counts for each (tanggal, kodeExtend) combination
      const uniqueKeys = [...importCounts.keys()]
      const dbCounts = new Map<string, number>()
      const CHUNK_SIZE = 50
      for (let i = 0; i < uniqueKeys.length; i += CHUNK_SIZE) {
        const chunk = uniqueKeys.slice(i, i + CHUNK_SIZE)
        for (const key of chunk) {
          const [tanggal, kodeExtend] = key.split('|||')
          const count = await db.sale.count({
            where: { tanggal, kodeExtend, idPenjualan: null },
          })
          dbCounts.set(key, count)
        }
      }

      // Build rows to keep: for each (tanggal, kodeExtend), import (importCount - dbCount) rows
      const keptWithoutId: typeof withoutIdPenjualan = []
      const keyUsageCount = new Map<string, number>()
      for (const s of withoutIdPenjualan) {
        const key = `${s.tanggal}|||${s.kodeExtend}`
        const importCount = importCounts.get(key) || 0
        const dbCount = dbCounts.get(key) || 0
        const used = keyUsageCount.get(key) || 0

        if (used < Math.max(0, importCount - dbCount)) {
          keptWithoutId.push(s)
          keyUsageCount.set(key, used + 1)
        } else {
          duplicateCount++
        }
      }
      newSalesData.push(...keptWithoutId)
    }

    // Recalculate stats for only the new (non-duplicate) rows
    let newTotalQty = 0
    let newTotalSettle = 0
    const newProducts = new Set<string>()
    for (const item of newSalesData) {
      newTotalQty += item.qty
      newTotalSettle += item.settle
      if (item.kodeExtend) newProducts.add(item.kodeExtend)
    }

    // If all rows are duplicates, return early with info
    if (newSalesData.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Semua ${duplicateCount} data sudah ada di database — tidak ada data baru yang diimpor`,
        summary: {
          totalRows: 0,
          duplicateRows: duplicateCount,
          totalQty: 0,
          totalSettle: 0,
          uniqueProducts: 0,
        },
      })
    }

    // Insert only new (non-duplicate) rows as unclaimed (crewId = null)
    const created = await db.sale.createMany({
      data: newSalesData.map((item) => ({
        tanggal: item.tanggal,
        idPenjualan: item.idPenjualan || null,
        statusRetention: item.statusRetention || null,
        retentionCode: item.retentionCode || null,
        kodeExtend: item.kodeExtend,
        brand: item.brand || null,
        dept: item.dept || null,
        modul: item.modul || null,
        ukuran: item.ukuran || null,
        qty: item.qty,
        hjp: item.hjp,
        netto: item.netto,
        diskon: item.diskon,
        diskonRp: item.diskonRp,
        potongan: item.potongan,
        potonganV: item.potonganV,
        settle: item.settle,
        pembayaran: item.pembayaran || null,
        program: item.program || null,
        channelStock: item.channelStock || null,
        crewId: null,
      })),
    })

    // Log upload activity
    logActivity('UPLOAD', `Upload ${created.count} data penjualan (${fmtRpShort(newTotalSettle)})`, undefined, undefined, { totalRows: created.count, totalSettle: newTotalSettle, duplicateRows: duplicateCount, uniqueProducts: newProducts.size })

    return NextResponse.json({
      success: true,
      message: duplicateCount > 0
        ? `Berhasil mengimpor ${created.count} data baru (${duplicateCount} duplikat dilewati)`
        : `Berhasil mengimpor ${created.count} data penjualan`,
      summary: {
        totalRows: created.count,
        duplicateRows: duplicateCount,
        totalQty: newTotalQty,
        totalSettle: newTotalSettle,
        uniqueProducts: newProducts.size,
      },
    })
  } catch (error) {
    console.error('Upload & import claim error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses file' },
      { status: 500 },
    )
  }
}

// ─────────────────────────────────────────────
// GET /api/claims — List sales with filters & pagination
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50'))) // PERF-06: cap at 100
    const search = searchParams.get('search') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const program = searchParams.get('program') || ''
    const claimed = searchParams.get('claimed') || ''
    const crewId = searchParams.get('crewId') || ''

    // Build Prisma where clause
    const where: Record<string, any> = {}

    // Claimed filter: "true" → claimed only, "false" → unclaimed only, omit → all
    if (claimed === 'true') {
      where.crewId = crewId ? crewId : { not: null }
    } else if (claimed === 'false') {
      where.crewId = { equals: null }
    } else if (crewId) {
      where.crewId = crewId
    }

    // Collect AND conditions that need OR (search, date) — combine them properly
    const andConditions: Record<string, any>[] = []

    // Search across kodeExtend, brand, dept, and crew name (case-insensitive for SQLite via LOWER())
    if (search) {
      // SQLite doesn't support Prisma's mode:'insensitive', so use raw query with LOWER()
      const searchPattern = `%${search.toLowerCase()}%`
      const matchingIds = await db.$queryRaw<{ id: string }[]>`
        SELECT DISTINCT s.id FROM Sale s
        LEFT JOIN Crew c ON s.crewId = c.id
        WHERE LOWER(s.kodeExtend) LIKE ${searchPattern}
           OR LOWER(s.brand) LIKE ${searchPattern}
           OR LOWER(s.dept) LIKE ${searchPattern}
           ${claimed !== 'false' ? Prisma.sql`OR LOWER(c.name) LIKE ${searchPattern}` : Prisma.empty}
      `
      if (matchingIds.length > 0) {
        andConditions.push({ id: { in: matchingIds.map(m => m.id) } })
      } else {
        // No matches — return empty result immediately
        return NextResponse.json({ sales: [], total: 0, page, totalPages: 1, summary: { totalQty: 0, totalSettle: 0, totalStruk: 0, basketSize: 0, pricePoint: 0 } })
      }
    }

    // Date range filter on tanggal
    // Handle both "2026-05-03" (date-only) and "2026-05-03 09:03" (with time) formats
    if (dateFrom || dateTo) {
      const tanggalOrConditions: Record<string, any>[] = []
      if (dateFrom && dateTo) {
        // Same-day filter: use startsWith to catch both "2026-05-03" and "2026-05-03 09:03"
        if (dateFrom === dateTo) {
          tanggalOrConditions.push({ tanggal: dateFrom })
          tanggalOrConditions.push({ tanggal: { startsWith: dateFrom } })
        } else {
          // Range filter: gte/lte works for date-only strings
          // Also add startsWith for from-date to catch "2026-05-03 09:03" >= "2026-05-03"
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

    // Combine all AND conditions
    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    // Program filter
    if (program) {
      where.program = program
    }

    const [sales, total, summary, strukGroups] = await Promise.all([
      db.sale.findMany({
        where,
        include: {
          crew: {
            select: { id: true, name: true, employeeId: true, photo: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.sale.count({ where }),
      // PERF-01: Use aggregation instead of loading all rows into memory
      db.sale.aggregate({
        _sum: { qty: true, settle: true, hjp: true },
        where,
      }),
      // Struk count based on UNIQUE idPenjualan (transaction/receipt ID)
      // One struk (receipt) can have multiple item rows with same idPenjualan
      db.sale.groupBy({
        by: ['idPenjualan'],
        where: { ...where, idPenjualan: { not: null } },
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / limit))

    // Calculate summary stats from aggregation result
    const totalQty = summary._sum.qty ?? 0
    const totalSettle = summary._sum.settle ?? 0
    // totalStruk = unique idPenjualan count (number of distinct transactions/receipts)
    const totalStruk = strukGroups.length
    // Basket Size = average items per transaction
    const basketSize = totalStruk > 0 ? totalQty / totalStruk : 0
    // Price Point = average price per item
    const pricePoint = totalQty > 0 ? totalSettle / totalQty : 0

    // ── Overview: aggregate counts across ALL data (not just current page) ──
    // Build a base where clause without crewId filter for overview aggregation
    const overviewBase: Record<string, any> = {}
    if (andConditions.length > 0) {
      overviewBase.AND = andConditions
    }
    if (program) {
      overviewBase.program = program
    }

    const todayStr = getWIBToday()

    const [unclaimedAgg, claimedAgg, todayActAgg] = await Promise.all([
      // Unclaimed: crewId is null
      db.sale.aggregate({
        _count: { id: true },
        _sum: { settle: true },
        where: { ...overviewBase, crewId: null },
      }),
      // Claimed: crewId is not null
      db.sale.aggregate({
        _count: { id: true },
        _sum: { settle: true },
        where: { ...overviewBase, crewId: { not: null } },
      }),
      // Today's activity: claimedAt within today's date range (WIB)
      // Use gte/lte range since claimedAt is a DateTime field (startsWith not supported)
      db.sale.count({
        where: {
          ...overviewBase,
          claimedAt: {
            gte: new Date(`${todayStr}T00:00:00.000Z`),
            lt: new Date(`${todayStr}T23:59:59.999Z`),
          },
        },
      }),
    ])

    const overview = {
      unclaimedCount: unclaimedAgg._count.id,
      unclaimedSettle: unclaimedAgg._sum.settle ?? 0,
      claimedCount: claimedAgg._count.id,
      claimedSettle: claimedAgg._sum.settle ?? 0,
      todayActivity: todayActAgg,
    }

    return NextResponse.json({
      sales,
      total,
      page,
      totalPages,
      summary: {
        totalQty,
        totalSettle,
        totalStruk,
        basketSize,
        pricePoint,
      },
      overview,
    })
  } catch (error) {
    console.error('Get claims error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// PUT /api/claims — Claim sales (assign crew to sales)
// Uses ATOMIC conditional update: WHERE crewId = null
// This prevents race conditions when multiple devices claim the same rows
// ─────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { saleIds, crewId } = body as { saleIds?: string[]; crewId?: string }

    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
      return NextResponse.json(
        { error: 'saleIds harus berupa array yang tidak kosong' },
        { status: 400 },
      )
    }

    // SEC-05: Cap array size to prevent abuse
    if (saleIds.length > 500) {
      return NextResponse.json(
        { error: 'Maksimal 500 item per request' },
        { status: 400 },
      )
    }

    if (!crewId) {
      return NextResponse.json({ error: 'crewId harus diisi' }, { status: 400 })
    }

    // Verify crew exists
    const crew = await db.crew.findUnique({ where: { id: crewId } })
    if (!crew) {
      return NextResponse.json({ error: 'Crew tidak ditemukan' }, { status: 404 })
    }

    // ━━━ ATOMIC CLAIM: single updateMany with WHERE crewId = null ━━━
    // This is the critical fix for race condition.
    // The database guarantees that only ONE request can set crewId on a row
    // where crewId was previously null. If another device claimed it first,
    // the WHERE clause won't match and that row won't be updated.
    const now = new Date()
    const result = await db.sale.updateMany({
      where: {
        id: { in: saleIds },
        crewId: null, // ← Atomic check: only update rows that are still unclaimed
      },
      data: {
        crewId,
        claimedAt: now,
      },
    })

    // ── Analyze results ──
    const requestedCount = saleIds.length
    const claimedCount = result.count
    const conflictCount = requestedCount - claimedCount

    // If nothing was claimed, check why
    if (claimedCount === 0) {
      // Check if sales exist at all
      const existingCount = await db.sale.count({
        where: { id: { in: saleIds } },
      })
      if (existingCount === 0) {
        return NextResponse.json(
          { error: 'Data penjualan tidak ditemukan', code: 'NOT_FOUND' },
          { status: 404 },
        )
      }
      // Sales exist but already claimed by someone else
      // Fetch who claimed them
      const alreadyClaimed = await db.sale.findMany({
        where: { id: { in: saleIds } },
        select: { id: true, crew: { select: { name: true } }, claimedAt: true },
      })
      return NextResponse.json({
        success: false,
        error: 'Semua data sudah di-claim oleh crew lain',
        code: 'ALL_CONFLICT',
        claimedCount: 0,
        conflictCount: requestedCount,
        conflictDetails: alreadyClaimed.map(s => ({
          saleId: s.id,
          claimedBy: s.crew?.name || 'Unknown',
          claimedAt: s.claimedAt,
        })),
        crewId,
        crewName: crew.name,
      }, { status: 409 })
    }

    // Partial success: some claimed, some conflicted
    if (conflictCount > 0) {
      // Fetch details of conflicted sales (who claimed them)
      const claimedSaleIds = await db.sale.findMany({
        where: { id: { in: saleIds }, crewId },
        select: { id: true, settle: true },
      })
      const totalSettle = claimedSaleIds.reduce((sum, s) => sum + s.settle, 0)

      const conflictedSales = await db.sale.findMany({
        where: { id: { in: saleIds }, crewId: { not: crewId } },
        select: { id: true, crew: { select: { name: true } }, claimedAt: true },
      })

      return NextResponse.json({
        success: true,
        message: `${claimedCount} data berhasil di-claim, ${conflictCount} data sudah di-claim crew lain`,
        code: 'PARTIAL_CONFLICT',
        claimedCount,
        conflictCount,
        totalSettle,
        conflictDetails: conflictedSales.map(s => ({
          saleId: s.id,
          claimedBy: s.crew?.name || 'Unknown',
          claimedAt: s.claimedAt,
        })),
        crewId,
        crewName: crew.name,
      })
    }

    // Full success: all claimed
    const claimedSales = await db.sale.findMany({
      where: { id: { in: saleIds }, crewId },
      select: { id: true, settle: true },
    })
    const totalSettle = claimedSales.reduce((sum, s) => sum + s.settle, 0)

    return NextResponse.json({
      success: true,
      message: `Berhasil meng-claim ${claimedCount} data penjualan untuk ${crew.name}`,
      code: 'SUCCESS',
      claimedCount,
      totalSettle,
      crewId,
      crewName: crew.name,
    })

    // Log claim activity (fire-and-forget after response)
    logActivity('CLAIM', `Claim ${claimedCount} data ke ${crew.name} (${fmtRpShort(totalSettle)})`, crew.name, undefined, { claimedCount, totalSettle, crewId: crew.id })
  } catch (error) {
    console.error('Claim sales error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat meng-claim' },
      { status: 500 },
    )
  }
}

// ─────────────────────────────────────────────
// PATCH /api/claims — Edit a sale record (admin)
// Allows: change crew assignment, edit qty/settle/dept/brand/tanggal
// ─────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, crewId, tanggal, kodeExtend, qty, settle, dept, brand, modul, pembayaran, program } = body as Record<string, unknown>

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID harus diisi' }, { status: 400 })
    }

    const sale = await db.sale.findUnique({ where: { id } })
    if (!sale) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    }

    // Build update data object
    const data: Record<string, unknown> = {}

    // Crew reassignment
    if (crewId !== undefined) {
      if (crewId === null || crewId === '') {
        data.crewId = null
        data.claimedAt = null
      } else {
        // Verify crew exists
        const crew = await db.crew.findUnique({ where: { id: crewId as string } })
        if (!crew) {
          return NextResponse.json({ error: 'Crew tidak ditemukan' }, { status: 404 })
        }
        data.crewId = crewId
        // Set claimedAt if transitioning from unclaimed to claimed
        if (!sale.crewId) {
          data.claimedAt = new Date()
        }
      }
    }

    // Editable fields — only update if provided and different
    if (tanggal !== undefined && typeof tanggal === 'string') data.tanggal = tanggal
    if (kodeExtend !== undefined && typeof kodeExtend === 'string') data.kodeExtend = kodeExtend
    if (qty !== undefined && typeof qty === 'number') data.qty = qty
    if (settle !== undefined && typeof settle === 'number') data.settle = settle
    if (dept !== undefined) data.dept = dept === '' ? null : dept
    if (brand !== undefined) data.brand = brand === '' ? null : brand
    if (modul !== undefined) data.modul = modul === '' ? null : modul
    if (pembayaran !== undefined) data.pembayaran = pembayaran === '' ? null : pembayaran
    if (program !== undefined) data.program = program === '' ? null : program

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 })
    }

    const updated = await db.sale.update({
      where: { id },
      data,
      include: {
        crew: { select: { id: true, name: true, employeeId: true, photo: true } },
      },
    })

    return NextResponse.json({ success: true, message: 'Data berhasil diperbarui', sale: updated })

    // Log edit activity
    logActivity('EDIT', `Edit data ${sale.kodeExtend}`, sale.crew?.name || undefined, sale.id, { changedFields: Object.keys(data) })
  } catch (error) {
    console.error('Edit claim error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengubah data' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// DELETE /api/claims — Delete a sale record
// ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID harus diisi' }, { status: 400 })
    }

    const sale = await db.sale.findUnique({ where: { id } })
    if (!sale) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    }

    await db.sale.delete({ where: { id } })

    // Log delete activity
    logActivity('DELETE', `Hapus data ${sale.kodeExtend} (${fmtRpShort(sale.settle)})`, sale.crew?.name || undefined, sale.id)

    return NextResponse.json({ success: true, message: 'Data penjualan berhasil dihapus' })
  } catch (error) {
    console.error('Delete claim error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus' },
      { status: 500 },
    )
  }
}
