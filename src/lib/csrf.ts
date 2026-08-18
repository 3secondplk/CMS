import { NextRequest } from 'next/server'

// Allowed origins for CORS/CSRF
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'http://localhost:81',   // Caddy gateway
  'http://localhost:3000', // Direct Next.js
]

// Validate Origin/Referer header for mutation requests
export function validateOrigin(request: NextRequest): boolean {
  const method = request.method.toUpperCase()

  // Only check mutation methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true
  }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // If no origin/referer, allow for same-origin requests (API tools, curl)
  // In a stricter config, this could be denied
  if (!origin && !referer) {
    return true // Allow same-origin requests without origin header
  }

  // Check origin
  if (origin) {
    try {
      const originUrl = new URL(origin)
      return ALLOWED_ORIGINS.some(allowed => {
        try {
          const allowedUrl = new URL(allowed)
          return originUrl.origin === allowedUrl.origin
        } catch { return false }
      })
    } catch { return false }
  }

  // Check referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      return ALLOWED_ORIGINS.some(allowed => {
        try {
          const allowedUrl = new URL(allowed)
          return refererUrl.origin === allowedUrl.origin
        } catch { return false }
      })
    } catch { return false }
  }

  return false
}

// Helper to create CORS response headers
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}
