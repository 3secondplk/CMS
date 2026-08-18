import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import * as crypto from 'crypto'

// ─── Shared JWT utility extracted from auth/route.ts ───
// SEC-006: No fallback — NEXT_AUTH_SECRET must be set
function getJwtSecret(): string {
  const secret = process.env.NEXT_AUTH_SECRET
  if (!secret) {
    throw new Error('NEXT_AUTH_SECRET environment variable is not configured. Set it before starting the application.')
  }
  if (secret.length < 32) {
    throw new Error('NEXT_AUTH_SECRET must be at least 32 characters long. Current length: ' + secret.length)
  }
  return secret
}

// Lazy-initialize the secret (read once per process, not per request)
let _cachedSecret: string | null = null
function jwtSecret(): string {
  if (!_cachedSecret) {
    _cachedSecret = getJwtSecret()
  }
  return _cachedSecret
}

export interface JWTPayload {
  adminId: string
  username: string
  name: string
  iat: number
  exp: number
}

function verifyJWT(token: string): JWTPayload | null {
  try {
    const secret = jwtSecret()
    const [header, body, signature] = token.split('.')
    if (!header || !body || !signature) return null
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
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
 * This is a low-level function — prefer requireAuth() which throws.
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

// ─── Authentication Error ─────────────────────────────────────
// Thrown by requireAuth() when the request is not authenticated.
// Route handlers should catch this and return a 401 response.
export class AuthenticationError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'AuthenticationError'
  }
}

/**
 * Require authentication — returns JWT payload or throws AuthenticationError.
 *
 * This function GUARANTEES the returned value is a valid JWTPayload.
 * Callers do NOT need to check for null — the type system enforces this:
 *
 *   const user = await requireAuth()
 *   // user: JWTPayload — always authenticated, never null
 *
 * If the request is not authenticated, AuthenticationError is thrown.
 * Handle it in your catch block:
 *
 *   catch (error) {
 *     if (error instanceof AuthenticationError) return unauthorized()
 *     // ... other error handling
 *   }
 *
 * Or use the handleApiError() helper for standardized error handling.
 */
export async function requireAuth(): Promise<JWTPayload> {
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new AuthenticationError()
  }
  return user
}

/** Helper: return a 401 response */
export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/**
 * Standardized API error handler.
 * Catches AuthenticationError and returns 401, other errors return 500.
 * Never exposes internal error details to the client.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthenticationError) {
    return unauthorized()
  }
  // Log internal error but don't expose details
  console.error('API error:', error)
  return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
}

/** Validate that NEXT_AUTH_SECRET is properly configured */
export function validateAuthSecret(): void {
  getJwtSecret()
}
