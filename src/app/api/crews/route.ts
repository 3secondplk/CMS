import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, AuthenticationError } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'
import { rateLimit, getClientId, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import { crewCreateSchema, crewUpdateSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // P0.6: Rate limiting
    const clientId = getClientId(request)
    const rl = await rateLimit(`crews-get:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

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
      include: { group: true },
      orderBy: { createdAt: 'asc' },
    })

    if (crews.length === 0) return NextResponse.json([])

    const crewIds = crews.map(c => c.id)

    // Get WIB today
    const now = new Date()
    const utc = now.getTime() + now.getTimezoneOffset() * 60000
    const wibNow = new Date(utc + 7 * 3600000)
    const todayStr = `${wibNow.getFullYear()}-${String(wibNow.getMonth() + 1).padStart(2, '0')}-${String(wibNow.getDate()).padStart(2, '0')}`

    // PERF: Use groupBy aggregation — NO row loading, DB computes sums
    const [allTimeAgg, todayAgg] = await Promise.all([
      db.sale.groupBy({
        by: ['crewId'],
        where: { crewId: { in: crewIds } },
        _sum: { settle: true, qty: true },
        _count: true,
      }),
      db.sale.groupBy({
        by: ['crewId'],
        where: { crewId: { in: crewIds }, tanggal: { startsWith: todayStr } },
        _sum: { settle: true },
      }),
    ])

    // Build lookup maps
    const allTimeMap = new Map(allTimeAgg.map(a => [a.crewId, a]))
    const todayMap = new Map(todayAgg.map(a => [a.crewId, a]))

    const crewsWithStats = crews.map(crew => {
      const agg = allTimeMap.get(crew.id)
      const tAgg = todayMap.get(crew.id)

      return {
        ...crew,
        totalSales: agg?._sum.settle ?? 0,
        totalQty: agg?._sum.qty ?? 0,
        todaySales: tAgg?._sum.settle ?? 0,
        transactionCount: agg?._count ?? 0,
      }
    })

    return NextResponse.json(crewsWithStats)
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('Get crews error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()

    // P0.6: Rate limiting
    const clientId = getClientId(request)
    const rl = await rateLimit(`crews-post:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    const body = await request.json()

    // P0.7: Input validation with Zod
    const parsed = crewCreateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }
    const { name, photo, employeeId, groupId } = parsed.data

    const crew = await db.crew.create({
      data: { name, photo: photo || null, employeeId, groupId },
      include: { group: true },
    })

    // Log create crew activity (fire-and-forget)
    logActivity('CREATE_CREW', {
      description: `Tambah crew: ${name}`,
      crewName: name,
      details: { name },
    }).catch(() => {})

    return NextResponse.json(crew, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('Create crew error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'ID Karyawan sudah terdaftar' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth()

    // P0.6: Rate limiting
    const clientId = getClientId(request)
    const rl = await rateLimit(`crews-put:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    const body = await request.json()

    // P0.7: Input validation with Zod
    const parsed = crewUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }
    const { id, name, photo, employeeId, groupId } = parsed.data

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
    if (error instanceof AuthenticationError) return unauthorized()
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
    const auth = await requireAuth()

    // P0.6: Rate limiting
    const clientId = getClientId(request)
    const rl = await rateLimit(`crews-delete:${clientId}`, RATE_LIMITS.API_STANDARD)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID crew harus diisi' }, { status: 400 })
    }

    const existing = await db.crew.findUnique({ where: { id } })

    if (existing) {
      // Log delete crew activity (fire-and-forget)
      logActivity('DELETE_CREW', {
        description: `Hapus crew: ${existing.name}`,
        crewName: existing.name,
        details: { name: existing.name },
      }).catch(() => {})
    }

    await db.crew.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('Delete crew error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Crew tidak ditemukan' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
