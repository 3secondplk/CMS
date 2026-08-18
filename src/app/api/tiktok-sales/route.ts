import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'
import { requireAuth, unauthorized, AuthenticationError } from '@/lib/auth'
import { rateLimit, getClientId, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import { tiktokSaleCreateSchema, TIKTOK_SORT_FIELDS, idSchema } from '@/lib/validation'

// ─── GET: List TikTok sales with filters ────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // P0.6: Rate limiting
    const clientId = getClientId(request)
    const rl = await rateLimit(`tiktok-sales-get:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const crewId = searchParams.get('crewId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const rawSortField = searchParams.get('sortField') || 'createdAt'
    const sortDir = searchParams.get('sortDir') || 'desc'

    // P0.7: Whitelist sort field to prevent injection
    const sortField = (TIKTOK_SORT_FIELDS as readonly string[]).includes(rawSortField) ? rawSortField : 'createdAt'

    const where: any = {}

    if (search) {
      where.OR = [
        { idOrder: { contains: search } },
        { artikel: { contains: search } },
      ]
    }
    if (status) where.status = status
    if (crewId) where.crewId = crewId
    if (dateFrom) where.tanggal = { ...(where.tanggal || {}), gte: dateFrom }
    if (dateTo) where.tanggal = { ...(where.tanggal || {}), lte: dateTo }

    const [items, total] = await Promise.all([
      db.tikTokSale.findMany({
        where,
        include: {
          crew: { select: { id: true, name: true, employeeId: true, photo: true, group: { select: { name: true } } } },
        },
        orderBy: { [sortField]: sortDir as 'asc' | 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.tikTokSale.count({ where }),
    ])

    // Summary stats
    const summaryWhere = dateFrom || dateTo ? {
      tanggal: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    } : undefined

    const summary = await db.tikTokSale.aggregate({
      _sum: { revenue: true, settle: true, qty: true },
      _count: true,
      where: summaryWhere as any,
    })

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalRevenue: summary._sum.revenue ?? 0,
        totalSettle: summary._sum.settle ?? 0,
        totalQty: summary._sum.qty ?? 0,
        count: summary._count,
      },
    })
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('TikTok sales GET error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// ─── POST: Create new TikTok sale ───────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // P0.6: Rate limiting
    const clientId = getClientId(request)
    const rl = await rateLimit(`tiktok-sales-post:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    const body = await request.json()

    // P0.7: Input validation with Zod
    const parsed = tiktokSaleCreateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }
    const { tanggal, idOrder, status, artikel, size, qty, revenue, settle, crewId } = parsed.data

    const sale = await db.tikTokSale.create({
      data: {
        tanggal,
        idOrder: idOrder.trim(),
        status: status || 'Pengiriman',
        artikel: artikel.trim(),
        size: size?.trim() || null,
        qty: qty || 1,
        revenue: revenue || 0,
        settle: settle || 0,
        crewId: crewId || null,
      },
      include: {
        crew: { select: { id: true, name: true, employeeId: true, photo: true, group: { select: { name: true } } } },
      },
    })

    await logActivity('TikTok Sale Created', { description: `Order ${sale.idOrder} — ${sale.artikel}`, crewName: sale.crew?.name })

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('TikTok sale POST error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// ─── PUT: Update a TikTok sale ──────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()

    // P0.6: Rate limiting
    const clientId = getClientId(request)
    const rl = await rateLimit(`tiktok-sales-put:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    const body = await request.json()
    const { id, ...data } = body

    // P0.7: ID validation
    const idResult = idSchema.safeParse(id)
    if (!idResult.success) {
      return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
    }

    const sale = await db.tikTokSale.update({
      where: { id },
      data: {
        tanggal: data.tanggal,
        idOrder: data.idOrder?.trim(),
        status: data.status,
        artikel: data.artikel?.trim(),
        size: data.size?.trim() || null,
        qty: parseInt(data.qty) || 1,
        revenue: parseFloat(data.revenue) || 0,
        settle: parseFloat(data.settle) || 0,
        crewId: data.crewId || null,
      },
      include: {
        crew: { select: { id: true, name: true, employeeId: true, photo: true, group: { select: { name: true } } } },
      },
    })

    await logActivity('TikTok Sale Updated', { description: `Order ${sale.idOrder} — ${sale.artikel}`, crewName: sale.crew?.name })

    return NextResponse.json(sale)
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('TikTok sale PUT error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// ─── DELETE: Delete TikTok sale(s) ──────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()

    // P0.6: Rate limiting
    const clientId = getClientId(request)
    const rl = await rateLimit(`tiktok-sales-delete:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const ids = searchParams.get('ids')

    if (ids) {
      const idList = ids.split(',')
      const deleted = await db.tikTokSale.deleteMany({ where: { id: { in: idList } } })
      await logActivity('TikTok Sale Batch Deleted', { description: `${deleted.count} penjualan TikTok dihapus` })
      return NextResponse.json({ deleted: deleted.count })
    }

    if (!id) {
      return NextResponse.json({ error: 'ID wajib' }, { status: 400 })
    }

    const sale = await db.tikTokSale.findUnique({ where: { id }, include: { crew: { select: { name: true } } } })
    await db.tikTokSale.delete({ where: { id } })
    await logActivity('TikTok Sale Deleted', { description: `Order ${sale?.idOrder} — ${sale?.artikel}`, crewName: sale?.crew?.name })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('TikTok sale DELETE error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}