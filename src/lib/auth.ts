import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import * as crypto from 'crypto'

// ─── Shared JWT utility extracted from auth/route.ts ───
const JWT_SECRET = process.env.NEXT_AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'cms-crew-dev-secret-local-only')

export interface JWTPayload {
  adminId: string
  username: string
  name: string
  iat: number
  exp: number
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

/**
 * Authenticate the current request via admin_token cookie.
 * Returns the JWT payload if valid, or null if unauthenticated.
 * Intended to be called at the top of every protected API handler.
 */
export async function getAuthenticatedUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')
    if (!token || !token.value) return null
    return verifyJWT(token.value)
  } catch {
    return null
  }
}

/**
 * Require authentication — returns payload or a 401 NextResponse.
 * Usage:
 *   const user = await requireAuth()
 *   if (!user) return  // NextResponse already sent
 */
export async function requireAuth(): Promise<JWTPayload | NextResponse> {
  const payload = await getAuthenticatedUser()
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return payload
}
