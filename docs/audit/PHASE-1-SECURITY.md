# PHASE 1 — SECURITY HARDENING

**Project**: 3SC CMS Crew Management System  
**Repository**: https://github.com/3secondplk/3SC  
**Date**: 2026-08-15  
**Implementer**: Implementation Engineer (GLM)  
**Verifier**: Independent Security Auditor (GPT)  
**Status**: READY FOR GPT VERIFICATION

---

## Summary

Phase 1 security hardening has been implemented across all 11 sub-phases (P0.1 through P0.11). All GPT verification corrections have been applied:

1. **SEC-016** reclassified as "Unvalidated sort field / parameter handling" (NOT "Prisma injection")
2. **SEC-009** documented with accurate impact assessment (medium, not HIGH)
3. **JWT revocation** — reduced access token lifetime to 8h; documented Phase 2 session strategy; no complex revocation built
4. **SEC-005** marked UNVERIFIED with evidence requirements; Caddy NOT modified
5. **Database** — SQLite unchanged, no PostgreSQL migration or HA

---

## Finding → Fix Mapping

| Finding ID | Finding | Fix Applied | Status |
|------------|---------|-------------|--------|
| SEC-001 | 11 API routes unauthenticated | Added `requireAuth()` (now throws AuthenticationError) to all protected routes | ✅ RESOLVED |
| SEC-002 | SHA-256 password hashing | Migrated to bcrypt (12 rounds) with automatic legacy migration path | ✅ RESOLVED |
| SEC-003 | Hardcoded default admin/admin123 | Removed auto-setup; `/api/auth/setup` requires SETUP_TOKEN env var | ✅ RESOLVED |
| SEC-004 | ignoreBuildErrors: true | Removed from next.config.ts | ✅ RESOLVED |
| SEC-005 | Caddy SSRF via XTransformPort | **UNVERIFIED** — evidence required: exact Caddyfile path, repo tracking, production use, exploitability proof | ⚠️ UNVERIFIED |
| SEC-006 | NEXT_AUTH_SECRET not configured | Now required (≥32 chars); app throws if missing; no fallback | ✅ RESOLVED |
| SEC-007 | /api/auth/setup unauthenticated | Requires SETUP_TOKEN; 403 if admins exist; rate limited | ✅ RESOLVED |
| SEC-008 | No rate limiting | All endpoints rate limited with 6 preset configs (TEMPORARY: in-memory) | ✅ RESOLVED |
| SEC-009 | DELETE /api/auth unauthenticated | Now requires auth. **Accurate impact**: only clears caller's own cookie; cannot forcibly log out another user. Fix applied for defense-in-depth. | ✅ RESOLVED |
| SEC-010 | No role/permission system | Permission abstraction created (20 permission types); currently all-authenticated=all-permissions; full RBAC deferred to Phase 3+ | ⚠️ PARTIAL |
| SEC-011 | No input validation | Zod schemas on all critical routes; sort field whitelists; file validation | ✅ RESOLVED |
| SEC-012 | Cascade delete Group→Crew | Requires soft-delete pattern | ⚠️ DEFERRED Phase 2 |
| SEC-013 | No CSRF/origin validation | Middleware origin check on all mutation requests | ✅ RESOLVED |
| SEC-014 | prisma in production dependencies | Low priority, no runtime security impact | ⚠️ DEFERRED Phase 2 |
| SEC-015 | Error detail leakage | Removed `detail: msg` from all 500 responses; generic error messages only | ✅ RESOLVED |
| SEC-016 | Unvalidated sort field / parameter handling | Explicit sort field whitelists (CLAIM_SORT_FIELDS, TIKTOK_SORT_FIELDS). This is NOT "Prisma injection" — Prisma's orderBy does not execute raw queries. Unvalidated parameters are constrained to whitelists. | ✅ RESOLVED |
| SEC-017 | 7-day JWT expiry / no refresh | Reduced to 8h. "No token revocation" is not a vulnerability by itself. Real concerns: (1) token lifetime, (2) stolen token exposure, (3) session invalidation. Phase 2: design session/refresh strategy with server-side state. | ✅ RESOLVED (Phase 1) / Phase 2 |
| SEC-018 | noImplicitAny: false | Set to true | ✅ RESOLVED |
| SEC-019 | reactStrictMode: false | Set to true | ✅ RESOLVED |
| SEC-020 | ESLint rules disabled | 6 critical rules re-enabled; 210 warnings remain as tech debt | ⚠️ PARTIAL |
| SEC-021 | tanggal as String not DateTime | Breaking migration required | ⚠️ DEFERRED Phase 2 |
| SEC-022 | No security headers | Middleware sets all recommended headers | ✅ RESOLVED |
| SEC-023 | next-auth dependency unused | Dead dependency | ⚠️ DEFERRED Phase 2 |
| SEC-024 | --accept-data-loss | Dev tooling config | ⚠️ DEFERRED Phase 2 |

---

## Files Changed

### New Files (8)
- `src/lib/password.ts` — bcrypt password hashing with legacy migration
- `src/lib/permissions.ts` — permission/authorization abstraction (20 permission types)
- `src/lib/rate-limit.ts` — in-memory rate limiter (**TEMPORARY**, Phase 2 Redis replacement)
- `src/lib/validation.ts` — Zod input validation schemas (15+ schemas, sort field whitelists)
- `src/lib/csrf.ts` — CSRF/origin validation helpers
- `src/middleware.ts` — security headers + CSRF origin protection
- `src/__tests__/security-unit.test.ts` — 36 security unit tests
- `vitest.config.ts` — test runner configuration

### Modified Files (30+)
- `src/lib/auth.ts` — requireAuth() now throws AuthenticationError (never null); no fallback JWT secret; AuthenticationError class; handleApiError() helper
- `src/lib/activity-logger.ts` — SECURITY_ACTIONS constants + logSecurityEvent() (12 event types)
- `src/app/api/auth/route.ts` — removed auto-setup; bcrypt migration; login/logout security events; rate limiting; Zod validation; AuthenticationError handling
- `src/app/api/auth/setup/route.ts` — requires SETUP_TOKEN; rate limited; 403 if admins exist; bcrypt
- `src/app/api/auth/change-password/route.ts` — bcrypt; min 8 chars; rate limiting; Zod validation; AuthenticationError
- `src/app/api/claims/route.ts` — requireAuth() (throws); rate limiting; AuthenticationError
- `src/app/api/claims/search/route.ts` — requireAuth(); AuthenticationError
- `src/app/api/claims/programs/route.ts` — requireAuth(); AuthenticationError
- `src/app/api/claims/unclaim/route.ts` — requireAuth(); AuthenticationError
- `src/app/api/claims/bulk-edit/route.ts` — requireAuth(); rate limiting; bulkEditSchema validation; AuthenticationError
- `src/app/api/claims/bulk-unclaim/route.ts` — requireAuth(); AuthenticationError
- `src/app/api/dashboard/route.ts` — requireAuth(); rate limiting; Zod validation; no error detail leakage; AuthenticationError
- `src/app/api/dashboard/group-detail/route.ts` — requireAuth(); rate limiting; Zod validation; no error detail leakage; AuthenticationError
- `src/app/api/crews/route.ts` — requireAuth() all methods; rate limiting; Zod validation; AuthenticationError
- `src/app/api/crews/batch-import/route.ts` — requireAuth() inside try; rate limiting; AuthenticationError
- `src/app/api/groups/route.ts` — requireAuth(); rate limiting; Zod validation; AuthenticationError
- `src/app/api/tiktok-sales/route.ts` — requireAuth() all methods; rate limiting; Zod validation; sort whitelist; no error detail leakage; AuthenticationError
- `src/app/api/tiktok-crews/route.ts` — requireAuth(); AuthenticationError
- `src/app/api/tiktok-sales/export/route.ts` — requireAuth(); rate limiting; no error detail leakage; AuthenticationError
- `src/app/api/tiktok-sales/import/route.ts` — requireAuth(); rate limiting; no error detail leakage; AuthenticationError
- `src/app/api/data/clear-all/route.ts` — requireAuth(); rate limiting; AuthenticationError
- `src/app/api/data/import/route.ts` — requireAuth() inside try; rate limiting; AuthenticationError
- `src/app/api/data/export/route.ts` — requireAuth() inside try; rate limiting; AuthenticationError
- `src/app/api/data/export-all/route.ts` — requireAuth(); rate limiting; AuthenticationError
- `src/app/api/export/route.ts` — requireAuth(); rate limiting; AuthenticationError
- `src/app/api/management/report/route.ts` — requireAuth(); AuthenticationError
- `src/app/api/activity-log/route.ts` — requireAuth(); rate limiting; Zod pagination validation; AuthenticationError
- `next.config.ts` — removed ignoreBuildErrors; reactStrictMode=true
- `tsconfig.json` — strict=true; noImplicitAny=true
- `prisma/seed.ts` — bcrypt password hashing; dev credential warning
- `.env` — NEXT_AUTH_SECRET (64 chars)
- `package.json` — bcryptjs, @types/bcryptjs, vitest, @types/node, test scripts

---

## Security Architecture

### Authentication Flow (After Fix)

```
1. User submits username/password to POST /api/auth
2. Server validates NEXT_AUTH_SECRET is configured (≥32 chars, no fallback)
3. Rate limit: 5 attempts per 15 min per IP+username
4. Server looks up admin in DB (no auto-setup)
5. If legacy SHA-256 hash → verify, then auto-migrate to bcrypt
6. If bcrypt hash → verify with bcrypt
7. On match: create JWT (HS256 HMAC, 8h expiry), set httpOnly cookie (sameSite=strict, secure=prod)
8. On failure: log LOGIN_FAILURE security event, return 401
9. Protected routes: const user = await requireAuth() — throws AuthenticationError if unauthenticated
10. Catch block: if (error instanceof AuthenticationError) return unauthorized()
11. Logout: DELETE /api/auth (requires auth) — clears cookie
```

### Authorization Flow (After Fix)

```
Phase 1:
- hasPermission(userId, permission) → always true for any authenticated user
- 20 permission types defined for future RBAC
- Architecture extensible: tenant → role → permission

Phase 3+ (future):
- Database-backed role/permission system
- Role assignments per user
- Permission checks against role_permissions table
```

### requireAuth() Design

**Before (insecure):**
```typescript
const user = await requireAuth() // Returns JWTPayload | null
if (!user) return unauthorized() // Easy to forget!
```

**After (safe):**
```typescript
const user = await requireAuth() // Returns JWTPayload — THROWS AuthenticationError if unauthenticated
// No null check needed — type system guarantees non-null
// Catch block handles: if (error instanceof AuthenticationError) return unauthorized()
```

This prevents accidental omission of the auth check.

---

## Rate Limit Architecture

| Config | Max Requests | Window | Applied To |
|--------|-------------|--------|------------|
| LOGIN | 5 | 15 min | `/api/auth` POST |
| PASSWORD_CHANGE | 3 | 15 min | `/api/auth/change-password` |
| SETUP | 3 | 1 hour | `/api/auth/setup` |
| IMPORT | 3 | 1 min | Claims upload, crew import, TikTok import, data import |
| EXPORT | 10 | 1 min | TikTok export, data export, CSV export |
| API_STANDARD | 60 | 1 min | All other endpoints |

**Implementation**: In-memory `Map<string, RateLimitEntry>` with 5-minute cleanup interval.

**⚠️ TEMPORARY** — This only works for a single app instance. Rate limits reset on server restart. **Phase 2 MUST replace with Redis/distributed rate limiting** for multi-instance deployments. The `src/lib/rate-limit.ts` file is explicitly marked with TEMPORARY and Phase 2 comments.

---

## Input Validation Architecture

### Zod Schemas (15+)
| Schema | Fields | Applied To |
|--------|--------|------------|
| `loginSchema` | username (1-100), password (1-1000) | `/api/auth` POST |
| `changePasswordSchema` | currentPassword, newPassword (min 8) | `/api/auth/change-password` |
| `crewCreateSchema` | name (≤200), employeeId (≤50), groupId, photo | `/api/crews` POST |
| `crewUpdateSchema` | partial crewCreate + id | `/api/crews` PUT |
| `groupCreateSchema` | name, targets, tiktokActive, logo | `/api/groups` POST |
| `groupUpdateSchema` | partial groupCreate + id | `/api/groups` PUT |
| `tiktokSaleCreateSchema` | tanggal, idOrder, artikel, status (whitelist), etc. | `/api/tiktok-sales` POST |
| `dashboardQuerySchema` | period (enum: today/week/month), month, year | `/api/dashboard` |
| `groupDetailQuerySchema` | groupId, period (enum: daily/weekly/monthly) | `/api/dashboard/group-detail` |
| `paginationSchema` | page (default 1), limit (1-100, default 50) | List endpoints |
| `sortSchema` | sortField (max 50), sortDir (asc/desc) | Sortable endpoints |
| `claimSaleSchema` | saleIds (1-500 items) | Claim operations |
| `bulkEditSchema` | saleIds + fields map | `/api/claims/bulk-edit` |
| `searchSchema` | q, query (max 500) | Search endpoints |
| `idSchema` | id (1-100 chars) | ID parameters |

### Sort Field Whitelists
- `CLAIM_SORT_FIELDS`: tanggal, kodeExtend, settle, qty, claimedAt, createdAt
- `TIKTOK_SORT_FIELDS`: tanggal, idOrder, revenue, settle, status, createdAt

**Important**: These are explicit whitelists, not "injection prevention". The concern is unvalidated parameter handling — arbitrary field names in Prisma orderBy could expose internal field names or cause unexpected behavior. Whitelists constrain this to known-safe values.

---

## Secret Handling

1. **NEXT_AUTH_SECRET** — Required environment variable, ≥32 characters. No hardcoded fallback. No empty-string fallback. App throws on startup if missing. Lazy-cached once per process.
2. **SETUP_TOKEN** — Required for initial admin creation via `/api/auth/setup`. Not in .env by default (setup disabled until configured).
3. **DATABASE_URL** — Configured in .env, not committed to git.
4. **No secrets in logs** — Passwords, JWTs, and secret values are never logged.
5. **No secrets in error responses** — Generic error messages; no internal details exposed.

---

## Tests

### Test Suite: `src/__tests__/security-unit.test.ts`

**36 tests covering 8 categories:**

| Category | Tests | Status |
|----------|-------|--------|
| 3. Authorization boundary | 3 | ✅ All pass |
| 6. JWT secret handling | 3 | ✅ All pass |
| 7. Password verification (bcrypt) | 4 | ✅ All pass |
| 9. Rate limiting | 5 | ✅ All pass |
| 10. Input validation (Zod) | 7 | ✅ All pass |
| 11. Sort field whitelists | 4 | ✅ All pass |
| 14. Build/type safety | 5 | ✅ All pass |
| Security architecture | 5 | ✅ All pass |

**Integration tests** (categories 1, 2, 4, 5, 8, 12, 13) require a running dev server and are verified via Agent Browser instead, due to sandbox memory constraints with the large codebase.

### Manual Verification Performed
- ✅ Unauthenticated access → 401 (dashboard, claims, tiktok-sales, crews, groups, activity-log)
- ✅ Authenticated access → 200 (all endpoints after login)
- ✅ Invalid JWT → 401
- ✅ Security headers present (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Rate limiting active (login rate limit, API rate limit)
- ✅ Login works with bcrypt-hashed passwords
- ✅ CSRF blocks invalid origins (403)

---

## Build Result

- **Lint**: 0 errors, 210 warnings ✅
- **TypeScript**: `ignoreBuildErrors` removed — build fails on type errors ✅
- **Tests**: 36/36 passing ✅
- **Dev server**: Compiles and serves correctly ✅

---

## Remaining Risks

1. **SEC-005 UNVERIFIED** — Caddy SSRF requires evidence before classification
2. **No token revocation** — JWT valid until 8h expiry. Phase 2: session table or refresh token architecture
3. **In-memory rate limiting** — Resets on restart; no multi-instance support. Phase 2: Redis
4. **Single role model** — All authenticated users have all permissions. Phase 3+: RBAC
5. **CSRF allows no-Origin requests** — Necessary for API tools; could be tightened
6. **CSP uses 'unsafe-inline' for styles** — Required for Tailwind CSS. Phase 2: nonce-based CSP
7. **ActivityLog not tamper-proof** — Any admin can read/write activity logs
8. **210 ESLint warnings** — Tech debt to address incrementally
9. **SQLite single-file DB** — No concurrent writes, no replication, no HA. Phase 2: PostgreSQL
10. **No distributed session store** — JWT-based with no server-side state

---

## Phase 2 Prerequisites

1. **PostgreSQL HA/replication** — Migrate from SQLite; add connection pooling (PgBouncer)
2. **Redis** — Distributed rate limiting; session store; caching
3. **Session/refresh token design** — Server-side session table; refresh token rotation; token revocation
4. **RBAC schema** — roles, permissions, role_permissions, user_roles tables
5. **Soft-delete pattern** — For Group→Crew cascade deletion
6. **DateTime migration** — Convert tanggal from String to DateTime (breaking migration)
7. **CSP nonce implementation** — Replace unsafe-inline with nonce-based CSP
8. **SEC-005 evidence** — Provide Caddyfile path, repo tracking status, production use, exploitability proof
9. **Structured error handling** — Centralized error classes; no detail leakage anywhere
10. **Docker/containerization** — Reproducible deployments
11. **CI/CD pipeline** — Automated security scanning (SAST, dependency audit)
12. **Backup/PITR** — Database backup strategy
13. **Observability** — Structured logging, metrics, tracing
