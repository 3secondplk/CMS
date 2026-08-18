import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, unauthorized, AuthenticationError } from '@/lib/auth'
import { verifyPassword, isLegacyHash, verifyLegacySha256, hashPassword } from '@/lib/password'
import { logActivity, logSecurityEvent, SECURITY_ACTIONS } from '@/lib/activity-logger'
import { rateLimit, getClientId, RATE_LIMITS, rateLimitHeaders } from '@/lib/rate-limit'
import { changePasswordSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth() // Throws AuthenticationError if unauthenticated

    // P0.6: Rate limiting — 3 password changes per 15 min
    const clientId = getClientId(request)
    const rl = await rateLimit(`password-change:${clientId}:${user.adminId}`, RATE_LIMITS.PASSWORD_CHANGE)
    if (!rl.allowed) {
      logSecurityEvent(SECURITY_ACTIONS.RATE_LIMIT_EXCEEDED, {
        description: 'Password change rate limit exceeded',
        subject: user.adminId,
        details: { endpoint: '/api/auth/change-password' },
      }).catch(() => {})
      return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429, headers: rateLimitHeaders(rl.remaining, rl.resetTime) })
    }

    const body = await request.json()

    // P0.7: Input validation with Zod (min 8 chars for new password)
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }
    const { currentPassword, newPassword } = parsed.data

    // Get current admin from DB
    const admin = await db.admin.findUnique({ where: { id: user.adminId } })
    if (!admin) {
      return NextResponse.json({ error: 'Admin tidak ditemukan' }, { status: 404 })
    }

    // P0.4: Validate current password (supports both bcrypt and legacy SHA-256)
    let passwordValid = false
    if (isLegacyHash(admin.password)) {
      passwordValid = verifyLegacySha256(currentPassword, admin.password)
    } else {
      passwordValid = await verifyPassword(currentPassword, admin.password)
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 401 })
    }

    // P0.4: Hash new password with bcrypt
    const hashedNew = await hashPassword(newPassword)
    await db.admin.update({
      where: { id: user.adminId },
      data: { password: hashedNew },
    })

    // Log password change activity
    logSecurityEvent(SECURITY_ACTIONS.PASSWORD_CHANGE, { description: 'Password berhasil diubah' }).catch(() => {})
    await logActivity(SECURITY_ACTIONS.PASSWORD_CHANGE, { description: 'Password berhasil diubah' }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Password berhasil diubah' })
  } catch (error) {
    if (error instanceof AuthenticationError) return unauthorized()
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
