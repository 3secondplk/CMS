import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as crypto from 'crypto'
import { logActivity, logSecurityEvent, SECURITY_ACTIONS } from '@/lib/activity-logger'
import { requireAuth, unauthorized, validateAuthSecret, AuthenticationError } from '@/lib/auth'
import { hashPassword, verifyPassword, isLegacyHash, verifyLegacySha256 } from '@/lib/password'
import { rateLimit, getClientId, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/validation'

// ─── Stateless JWT for serverless (Vercel) compatibility ───
// P0.5: No fallback — NEXT_AUTH_SECRET must be set
function getJwtSecret(): string {
  const secret = process.env.NEXT_AUTH_SECRET
  if (!secret) {
    throw new Error('NEXT_AUTH_SECRET environment variable is not configured.')
  }
  if (secret.length < 32) {
    throw new Error('NEXT_AUTH_SECRET must be at least 32 characters long.')
  }
  return secret
}

let _cachedSecret: string | null = null
function jwtSecret(): string {
  if (!_cachedSecret) {
    _cachedSecret = getJwtSecret()
  }
  return _cachedSecret
}

// P0.5: Reduced JWT expiry from 7 days to 8 hours
const JWT_EXPIRY_MS = 8 * 60 * 60 * 1000 // 8 hours

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
  const signature = crypto.createHmac('sha256', jwtSecret()).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

function verifyJWT(token: string): JWTPayload | null {
  try {
    const [header, body, signature] = token.split('.')
    if (!header || !body || !signature) return null
    const expectedSig = crypto.createHmac('sha256', jwtSecret()).update(`${header}.${body}`).digest('base64url')
    if (signature !== expectedSig) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as JWTPayload
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

// POST /api/auth — Login (no auth required — this IS the login endpoint)
export async function POST(request: NextRequest) {
  try {
    // P0.5: Validate NEXT_AUTH_SECRET is configured
    try {
      validateAuthSecret()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Auth secret not configured'
      return NextResponse.json({ error: `Server configuration error: ${msg}` }, { status: 500 })
    }

    // P0.6: Rate limiting — 5 login attempts per 15 min per IP+username
    const clientId = getClientId(request)
    const body = await request.json()

    // P0.7: Input validation with Zod
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Username dan password harus diisi' }, { status: 400 })
    }
    const { username, password } = parsed.data

    const rl = await rateLimit(`login:${clientId}:${username}`, RATE_LIMITS.LOGIN)
    if (!rl.allowed) {
      logSecurityEvent(SECURITY_ACTIONS.RATE_LIMIT_EXCEEDED, {
        description: 'Login rate limit exceeded',
        subject: clientId,
        details: { username, endpoint: '/api/auth' },
      }).catch(() => {})
      return NextResponse.json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    // P0.3: Removed auto-setup logic. Login endpoint ONLY authenticates, never creates users.
    const admin = await db.admin.findUnique({
      where: { username },
    })

    if (!admin) {
      logSecurityEvent(SECURITY_ACTIONS.LOGIN_FAILURE, {
        description: 'Login failed — unknown username',
        subject: clientId,
        details: { username },
      }).catch(() => {})
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    // P0.4: Support both bcrypt and legacy SHA-256 (migration path)
    let passwordValid = false
    if (isLegacyHash(admin.password)) {
      // Legacy SHA-256 hash — verify and migrate to bcrypt
      passwordValid = verifyLegacySha256(password, admin.password)
      if (passwordValid) {
        // Migrate: re-hash with bcrypt and update DB
        const newHash = await hashPassword(password)
        await db.admin.update({
          where: { id: admin.id },
          data: { password: newHash },
        })
        logSecurityEvent(SECURITY_ACTIONS.LEGACY_PASSWORD_MIGRATED, {
          description: 'Legacy SHA-256 password migrated to bcrypt',
          subject: admin.username,
        }).catch(() => {})
      }
    } else {
      // bcrypt hash — verify with bcrypt
      passwordValid = await verifyPassword(password, admin.password)
    }

    if (!passwordValid) {
      logSecurityEvent(SECURITY_ACTIONS.LOGIN_FAILURE, {
        description: 'Login failed — wrong password',
        subject: clientId,
        details: { username },
      }).catch(() => {})
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }

    const token = createJWT({ adminId: admin.id, username: admin.username, name: admin.name })

    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // P0.5: Changed from 'lax' to 'strict' for admin app
      maxAge: 60 * 60 * 8, // P0.5: 8 hours (matches JWT_EXPIRY_MS)
      path: '/',
    })

    // Log login activity (fire-and-forget)
    logSecurityEvent(SECURITY_ACTIONS.LOGIN_SUCCESS, {
      description: 'Login berhasil',
      subject: admin.username,
    }).catch(() => {})
    logActivity('LOGIN', { description: 'Login berhasil' }).catch(() => {})

    return NextResponse.json({
      success: true,
      admin: { id: admin.id, username: admin.username, name: admin.name },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// GET /api/auth — Verify session (requires auth)
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

// DELETE /api/auth — Logout (P0.5: now requires auth)
export async function DELETE() {
  try {
    // P0.5: Add auth check — anyone should not be able to trigger logout
    const user = await requireAuth() // Throws AuthenticationError if unauthenticated

    // Log logout activity before clearing cookie
    logSecurityEvent(SECURITY_ACTIONS.LOGOUT, { description: 'Logout berhasil' }).catch(() => {})
    await logActivity('LOGOUT', { description: 'Logout berhasil' })

    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.delete('admin_token')

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
