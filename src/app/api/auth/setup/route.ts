import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { rateLimit, getClientId, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import { logSecurityEvent, SECURITY_ACTIONS } from '@/lib/activity-logger'
import { Prisma } from '@prisma/client'

// POST /api/auth/setup — Create initial admin (requires SETUP_TOKEN env var)
// P0.3: If admins exist → 403. If no SETUP_TOKEN → 503. If SETUP_TOKEN mismatch → 401.
// Phase 2: TOCTOU protection — uses transactional count+create + P2002 unique violation handling
export async function POST(request: NextRequest) {
  try {
    // P0.6: Rate limiting — 3 setup attempts per hour
    const clientId = getClientId(request)
    const rl = await rateLimit(`setup:${clientId}`, RATE_LIMITS.SETUP)
    if (!rl.allowed) {
      logSecurityEvent(SECURITY_ACTIONS.RATE_LIMIT_EXCEEDED, {
        description: 'Setup rate limit exceeded',
        subject: clientId,
        details: { endpoint: '/api/auth/setup' },
      }).catch(() => {})
      return NextResponse.json({ error: 'Too many setup attempts. Try again later.' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    // Require SETUP_TOKEN env var for authorization (check early before DB work)
    const setupToken = process.env.SETUP_TOKEN
    if (!setupToken) {
      return NextResponse.json(
        { error: 'Initial setup is disabled. Configure SETUP_TOKEN environment variable to enable.' },
        { status: 503 },
      )
    }

    const body = await request.json()
    const { setupToken: providedToken, username, password, name } = body

    if (providedToken !== setupToken) {
      return NextResponse.json({ error: 'Invalid setup token' }, { status: 401 })
    }

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // P0.4: Hash with bcrypt
    const hashedPassword = await hashPassword(password)

    // Phase 2: TOCTOU-safe admin creation
    // Use interactive transaction to atomically check count + create.
    // If a concurrent request creates an admin between our count and create,
    // the unique constraint on username will throw P2002, which we handle.
    let admin
    try {
      admin = await db.$transaction(async (tx) => {
        const adminCount = await tx.admin.count()
        if (adminCount > 0) {
          throw new SetupError('Setup already completed. Admin accounts exist.', 403)
        }

        return tx.admin.create({
          data: {
            username,
            password: hashedPassword,
            name: name || 'Administrator',
          },
        })
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      // P2002: Unique constraint violation — another admin was created concurrently
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Setup already completed. Admin accounts exist.' },
          { status: 403 },
        )
      }
      // Our own SetupError
      if (error instanceof SetupError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode })
      }
      throw error // re-throw for outer catch
    }

    // Log admin creation security event
    logSecurityEvent(SECURITY_ACTIONS.SETUP_ADMIN_CREATED, {
      description: 'Initial admin created via setup endpoint',
      subject: username,
      details: { adminId: admin.id, adminName: admin.name },
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      message: 'Admin created successfully',
      admin: { id: admin.id, username: admin.username, name: admin.name },
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      ok: false,
      error: 'Setup failed',
    }, { status: 500 })
  }
}

// Custom error for setup-specific failures
class SetupError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'SetupError'
    this.statusCode = statusCode
  }
}

// GET /api/auth/setup — Check setup status
export async function GET() {
  try {
    const count = await db.admin.count()

    if (count > 0) {
      return NextResponse.json({
        ok: true,
        setupComplete: true,
        message: `Setup already completed (${count} admin(s) exist)`,
      })
    }

    return NextResponse.json({
      ok: true,
      setupComplete: false,
      message: 'No admin accounts exist. Use POST with SETUP_TOKEN to create initial admin.',
    })
  } catch (error) {
    console.error('Setup check error:', error)
    return NextResponse.json({
      ok: false,
      error: 'Database connection failed',
    }, { status: 500 })
  }
}
