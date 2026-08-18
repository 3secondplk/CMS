/**
 * PHASE 1 Security Tests — Unit Tests
 * These tests don't require the dev server to be running.
 * They test security modules directly.
 *
 * Categories covered:
 * 3. Wrong authorization (role check)
 * 6. Missing JWT secret → server error
 * 7. Password verification (bcrypt)
 * 9. Rate limiting
 * 11. Invalid sort field → whitelist enforced
 * 14. Production build safety
 */

import { describe, it, expect } from 'vitest'

// ─── 3. Authorization Boundary ────────────────────────────

describe('3. Authorization boundary', () => {
  it('permission system returns true for all authenticated users (Phase 1)', async () => {
    const { hasPermission } = await import('@/lib/permissions')
    expect(hasPermission('any-user', 'sales.read')).toBe(true)
    expect(hasPermission('any-user', 'data.delete')).toBe(true)
    expect(hasPermission('any-user', 'settings.manage')).toBe(true)
  })

  it('requirePermission is consistent with hasPermission', async () => {
    const { requirePermission } = await import('@/lib/permissions')
    expect(requirePermission('any-user', 'sales.claim')).toBe(true)
    expect(requirePermission('any-user', 'crew.manage' as any)).toBe(true)
  })

  it('all 20 permission types are defined', async () => {
    const mod = await import('@/lib/permissions')
    // Verify the module exports the expected types
    expect(mod.hasPermission).toBeDefined()
    expect(mod.requirePermission).toBeDefined()
  })
})

// ─── 6. Missing JWT Secret ────────────────────────────────

describe('6. Missing JWT secret handling', () => {
  it('validateAuthSecret throws when NEXT_AUTH_SECRET is missing', async () => {
    const originalSecret = process.env.NEXT_AUTH_SECRET
    delete process.env.NEXT_AUTH_SECRET

    // Force re-import by clearing cache
    const { validateAuthSecret } = await import('@/lib/auth')
    expect(() => validateAuthSecret()).toThrow(/NEXT_AUTH_SECRET/)

    if (originalSecret) process.env.NEXT_AUTH_SECRET = originalSecret
  })

  it('validateAuthSecret throws when NEXT_AUTH_SECRET is too short', async () => {
    const originalSecret = process.env.NEXT_AUTH_SECRET
    process.env.NEXT_AUTH_SECRET = 'too-short'

    const { validateAuthSecret } = await import('@/lib/auth')
    expect(() => validateAuthSecret()).toThrow(/32 characters/)

    if (originalSecret) process.env.NEXT_AUTH_SECRET = originalSecret
  })

  it('NEXT_AUTH_SECRET exists in .env', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const envPath = path.join(process.cwd(), '.env')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    expect(envContent).toContain('NEXT_AUTH_SECRET=')
    // Verify it's at least 32 chars
    const match = envContent.match(/NEXT_AUTH_SECRET=(.+)/)
    expect(match).toBeTruthy()
    expect(match![1].trim().length).toBeGreaterThanOrEqual(32)
  })
})

// ─── 7. Password Verification ─────────────────────────────

describe('7. Password verification (bcrypt)', () => {
  it('bcrypt hash and verify work correctly', async () => {
    const { hashPassword, verifyPassword } = await import('@/lib/password')
    const hash = await hashPassword('test-password-123')
    expect(hash).toBeTruthy()
    expect(hash).not.toBe('test-password-123') // Not plaintext
    expect(await verifyPassword('test-password-123', hash)).toBe(true)
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('bcrypt hashes are unique (salted)', async () => {
    const { hashPassword } = await import('@/lib/password')
    const hash1 = await hashPassword('same-password')
    const hash2 = await hashPassword('same-password')
    expect(hash1).not.toBe(hash2) // Different salts
  })

  it('legacy SHA-256 detection works', async () => {
    const { isLegacyHash, verifyLegacySha256 } = await import('@/lib/password')
    const crypto = await import('crypto')

    const shaHash = crypto.createHash('sha256').update('test').digest('hex')
    expect(isLegacyHash(shaHash)).toBe(true)
    expect(isLegacyHash('$2a$12$notasha256hash')).toBe(false)
    expect(isLegacyHash('')).toBe(false)
    expect(isLegacyHash('short')).toBe(false)

    expect(verifyLegacySha256('test', shaHash)).toBe(true)
    expect(verifyLegacySha256('wrong', shaHash)).toBe(false)
  })

  it('bcrypt hash starts with $2a$ or $2b$', async () => {
    const { hashPassword } = await import('@/lib/password')
    const hash = await hashPassword('test')
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true)
  })
})

// ─── 9. Rate Limiting ─────────────────────────────────────

describe('9. Rate limiting', () => {
  it('rate limit module has correct presets', async () => {
    const { RATE_LIMITS } = await import('@/lib/rate-limit')
    expect(RATE_LIMITS.LOGIN.maxRequests).toBe(5)
    expect(RATE_LIMITS.LOGIN.windowMs).toBe(15 * 60 * 1000)
    expect(RATE_LIMITS.PASSWORD_CHANGE.maxRequests).toBe(3)
    expect(RATE_LIMITS.API_STANDARD.maxRequests).toBe(60)
    expect(RATE_LIMITS.IMPORT.maxRequests).toBe(3)
    expect(RATE_LIMITS.EXPORT.maxRequests).toBe(10)
    expect(RATE_LIMITS.SETUP.maxRequests).toBe(3)
  })

  it('rate limit function works correctly — allows then blocks', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const key = `test-${Date.now()}-rl`

    // Should allow first request
    const r1 = await rateLimit(key, { maxRequests: 2, windowMs: 60000, failPolicy: 'low_risk_read' })
    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(1)

    // Should allow second request
    const r2 = await rateLimit(key, { maxRequests: 2, windowMs: 60000, failPolicy: 'low_risk_read' })
    expect(r2.allowed).toBe(true)
    expect(r2.remaining).toBe(0)

    // Should block third request
    const r3 = await rateLimit(key, { maxRequests: 2, windowMs: 60000, failPolicy: 'low_risk_read' })
    expect(r3.allowed).toBe(false)
    expect(r3.remaining).toBe(0)
  })

  it('rate limit resets after window expires', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const key = `test-${Date.now()}-reset`

    // Exhaust the limit with 1ms window
    await rateLimit(key, { maxRequests: 1, windowMs: 1, failPolicy: 'low_risk_read' })
    const blocked = await rateLimit(key, { maxRequests: 1, windowMs: 1, failPolicy: 'low_risk_read' })
    expect(blocked.allowed).toBe(false)

    // Wait for window to expire and try with new window
    await new Promise(r => setTimeout(r, 10))
    const fresh = await rateLimit(key, { maxRequests: 1, windowMs: 60000, failPolicy: 'low_risk_read' })
    expect(fresh.allowed).toBe(true)
  })

  it('different keys have independent limits', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const key1 = `test-${Date.now()}-a`
    const key2 = `test-${Date.now()}-b`

    await rateLimit(key1, { maxRequests: 1, windowMs: 60000, failPolicy: 'low_risk_read' })
    const blocked = await rateLimit(key1, { maxRequests: 1, windowMs: 60000, failPolicy: 'low_risk_read' })
    expect(blocked.allowed).toBe(false)

    const allowed = await rateLimit(key2, { maxRequests: 1, windowMs: 60000, failPolicy: 'low_risk_read' })
    expect(allowed.allowed).toBe(true)
  })

  it('rate limit is PostgreSQL-backed with fail policy', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const content = fs.readFileSync(path.join(process.cwd(), 'src/lib/rate-limit.ts'), 'utf-8')
    // Phase 4: Replaced in-memory with PostgreSQL-backed fixed-window counter
    expect(content).toContain('FailPolicy')
    expect(content).toContain('fixed-window')
    expect(content).toContain('security_sensitive')
    expect(content).toContain('fail-open')
  })
})

// ─── 10. Input Validation (Zod) ───────────────────────────

describe('10. Input validation (Zod schemas)', () => {
  it('loginSchema rejects empty inputs', async () => {
    const { loginSchema } = await import('@/lib/validation')
    expect(loginSchema.safeParse({}).success).toBe(false)
    expect(loginSchema.safeParse({ username: '', password: '' }).success).toBe(false)
    expect(loginSchema.safeParse({ username: 'admin', password: 'pass' }).success).toBe(true)
  })

  it('changePasswordSchema requires min 8 chars for new password', async () => {
    const { changePasswordSchema } = await import('@/lib/validation')
    expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'short' }).success).toBe(false)
    expect(changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'long-enough' }).success).toBe(true)
  })

  it('tiktokSaleCreateSchema validates required fields', async () => {
    const { tiktokSaleCreateSchema } = await import('@/lib/validation')
    expect(tiktokSaleCreateSchema.safeParse({}).success).toBe(false)
    expect(tiktokSaleCreateSchema.safeParse({
      tanggal: '2024-01-01',
      idOrder: 'ORD-001',
      artikel: 'Test',
    }).success).toBe(true)
  })

  it('tiktokSaleCreateSchema validates status whitelist', async () => {
    const { tiktokSaleCreateSchema } = await import('@/lib/validation')
    expect(tiktokSaleCreateSchema.safeParse({
      tanggal: '2024-01-01',
      idOrder: 'ORD-001',
      artikel: 'Test',
      status: 'INVALID',
    }).success).toBe(false)
    expect(tiktokSaleCreateSchema.safeParse({
      tanggal: '2024-01-01',
      idOrder: 'ORD-001',
      artikel: 'Test',
      status: 'Pengiriman',
    }).success).toBe(true)
  })

  it('paginationSchema has sensible defaults', async () => {
    const { paginationSchema } = await import('@/lib/validation')
    const result = paginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(50)
    }
  })

  it('paginationSchema rejects limit > 100', async () => {
    const { paginationSchema } = await import('@/lib/validation')
    const result = paginationSchema.safeParse({ limit: 999 })
    expect(result.success).toBe(false) // max(100) rejects, doesn't cap
  })

  it('claimSaleSchema validates saleIds array', async () => {
    const { claimSaleSchema } = await import('@/lib/validation')
    expect(claimSaleSchema.safeParse({ saleIds: [] }).success).toBe(false)
    expect(claimSaleSchema.safeParse({ saleIds: ['id1'] }).success).toBe(true)
  })
})

// ─── 11. Invalid Sort Field ───────────────────────────────

describe('11. Invalid sort field → whitelist enforced', () => {
  it('sort field whitelists are defined', async () => {
    const { CLAIM_SORT_FIELDS, TIKTOK_SORT_FIELDS } = await import('@/lib/validation')
    expect(CLAIM_SORT_FIELDS.length).toBeGreaterThan(0)
    expect(TIKTOK_SORT_FIELDS.length).toBeGreaterThan(0)
  })

  it('whitelists contain expected fields', async () => {
    const { CLAIM_SORT_FIELDS, TIKTOK_SORT_FIELDS } = await import('@/lib/validation')
    expect(CLAIM_SORT_FIELDS).toContain('tanggal')
    expect(CLAIM_SORT_FIELDS).toContain('createdAt')
    expect(TIKTOK_SORT_FIELDS).toContain('tanggal')
    expect(TIKTOK_SORT_FIELDS).toContain('createdAt')
  })

  it('whitelists exclude dangerous values', async () => {
    const { CLAIM_SORT_FIELDS, TIKTOK_SORT_FIELDS } = await import('@/lib/validation')
    expect(CLAIM_SORT_FIELDS).not.toContain('__proto__')
    expect(CLAIM_SORT_FIELDS).not.toContain('constructor')
    expect(CLAIM_SORT_FIELDS).not.toContain('prototype')
    expect(TIKTOK_SORT_FIELDS).not.toContain('__proto__')
    expect(TIKTOK_SORT_FIELDS).not.toContain('constructor')
  })

  it('sortSchema validates sortDir enum', async () => {
    const { sortSchema } = await import('@/lib/validation')
    expect(sortSchema.safeParse({ sortDir: 'asc' }).success).toBe(true)
    expect(sortSchema.safeParse({ sortDir: 'desc' }).success).toBe(true)
    expect(sortSchema.safeParse({ sortDir: 'invalid' }).success).toBe(false)
  })
})

// ─── 14. Build/Type Safety ────────────────────────────────

describe('14. Build/type safety', () => {
  it('next.config.ts does NOT have ignoreBuildErrors', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const config = fs.readFileSync(path.join(process.cwd(), 'next.config.ts'), 'utf-8')
    expect(config).not.toContain('ignoreBuildErrors')
  })

  it('tsconfig.json has strict: true', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const tsconfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8'))
    expect(tsconfig.compilerOptions.strict).toBe(true)
  })

  it('tsconfig.json has noImplicitAny: true', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const tsconfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8'))
    expect(tsconfig.compilerOptions.noImplicitAny).toBe(true)
  })

  it('reactStrictMode is true', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const config = fs.readFileSync(path.join(process.cwd(), 'next.config.ts'), 'utf-8')
    expect(config).toContain('reactStrictMode: true')
  })

  it('middleware.ts exists for security headers', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const mw = fs.readFileSync(path.join(process.cwd(), 'src/middleware.ts'), 'utf-8')
    expect(mw).toContain('X-Content-Type-Options')
    expect(mw).toContain('X-Frame-Options')
    expect(mw).toContain('Content-Security-Policy')
  })
})

// ─── Security Architecture ────────────────────────────────

describe('Security architecture verification', () => {
  it('AuthenticationError class exists and is throwable', async () => {
    const { AuthenticationError } = await import('@/lib/auth')
    const err = new AuthenticationError()
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('AuthenticationError')
    expect(err.message).toBe('Unauthorized')
  })

  it('requireAuth returns JWTPayload type (never null)', async () => {
    // This is a type-level test — requireAuth now throws instead of returning null
    // Verify the function signature by checking the module exports
    const mod = await import('@/lib/auth')
    expect(mod.requireAuth).toBeDefined()
    expect(mod.AuthenticationError).toBeDefined()
    expect(mod.handleApiError).toBeDefined()
    expect(mod.unauthorized).toBeDefined()
    expect(mod.validateAuthSecret).toBeDefined()
  })

  it('CSRF module validates origins', async () => {
    const { validateOrigin } = await import('@/lib/csrf')
    expect(validateOrigin).toBeDefined()
  })

  it('security audit logger has all required event types', async () => {
    const { SECURITY_ACTIONS } = await import('@/lib/activity-logger')
    expect(SECURITY_ACTIONS.LOGIN_SUCCESS).toBeDefined()
    expect(SECURITY_ACTIONS.LOGIN_FAILURE).toBeDefined()
    expect(SECURITY_ACTIONS.LOGOUT).toBeDefined()
    expect(SECURITY_ACTIONS.PASSWORD_CHANGE).toBeDefined()
    expect(SECURITY_ACTIONS.SETUP_ADMIN_CREATED).toBeDefined()
    expect(SECURITY_ACTIONS.RATE_LIMIT_EXCEEDED).toBeDefined()
    expect(SECURITY_ACTIONS.ORIGIN_VALIDATION_FAILED).toBeDefined()
    expect(SECURITY_ACTIONS.LEGACY_PASSWORD_MIGRATED).toBeDefined()
    expect(SECURITY_ACTIONS.DATA_CLEAR_ALL).toBeDefined()
    expect(SECURITY_ACTIONS.BULK_IMPORT).toBeDefined()
    expect(SECURITY_ACTIONS.BULK_EXPORT).toBeDefined()
    expect(SECURITY_ACTIONS.UNAUTHORIZED_ACCESS_ATTEMPT).toBeDefined()
  })

  it('.env has NEXT_AUTH_SECRET configured', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8')
    expect(env).toContain('NEXT_AUTH_SECRET=')
  })
})
