import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// NOTE: This middleware runs in the Edge Runtime.
// Do NOT import any Node.js modules (crypto, fs, etc.) or Prisma here.
// Security event logging for origin failures is handled in the route handlers.

export function middleware(request: NextRequest) {
  // CSRF/Origin check for mutation requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')

    if (origin || referer) {
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'http://localhost:81',
        'http://localhost:3000',
      ]

      const sourceUrl = origin || referer
      if (sourceUrl) {
        try {
          const sourceOrigin = new URL(sourceUrl).origin
          const isAllowed = allowedOrigins.some(allowed => {
            try { return new URL(allowed).origin === sourceOrigin } catch { return false }
          })
          if (!isAllowed) {
            // Log to console since we can't use Prisma in Edge Runtime
            console.warn(`[SECURITY] ORIGIN_VALIDATION_FAILED: ${request.method} ${request.nextUrl.pathname} from ${sourceOrigin}`)
            return NextResponse.json({ error: 'Forbidden - invalid origin' }, { status: 403 })
          }
        } catch {
          console.warn(`[SECURITY] ORIGIN_VALIDATION_FAILED: ${request.method} ${request.nextUrl.pathname} unparseable origin`)
          return NextResponse.json({ error: 'Forbidden - invalid origin' }, { status: 403 })
        }
      }
    }
  }

  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '0') // Deprecated, but added for legacy browsers
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // HSTS - only in production with HTTPS
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Content-Security-Policy - permissive for development, restrictive for production
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    // Dev: allow everything needed for Next.js HMR and dev tools
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ws: wss: http: https:; frame-ancestors 'none';"
    )
  } else {
    // Production: restrictive CSP
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    )
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|apple-touch-icon.png|logo.png|logo.svg|logo-loader.webp|manifest.json|robots.txt).*)',
  ],
}
