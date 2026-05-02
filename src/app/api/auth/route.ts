import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as crypto from 'crypto'

// ─── Stateless JWT for serverless (Vercel) compatibility ───
const JWT_SECRET = process.env.JWT_SECRET || 'cms-crew-jwt-secret-ahtjong-labs-2025'
const JWT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface JWTPayload {
  adminId: string
  username: string
  name: string
  iat: number
  exp: number
}

function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Date.now()
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + JWT_EXPIRY_MS })).toString('base64url')
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

function verifyJWT(token: string): JWTPayload | null {
  try {
    const [header, body, signature] = token.split('.')
    if (!header || !body || !signature) return null
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    if (signature !== expectedSig) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as JWTPayload
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 })
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')

    const admin = await db.admin.findUnique({
      where: { username },
    })

    if (!admin || admin.password !== hashedPassword) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    const token = createJWT({ adminId: admin.id, username: admin.username, name: admin.name })

    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return NextResponse.json({
      success: true,
      admin: { id: admin.id, username: admin.username, name: admin.name },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')

    if (!token || !token.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyJWT(token.value)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      admin: { id: payload.adminId, username: payload.username, name: payload.name },
    })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.delete('admin_token')

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
