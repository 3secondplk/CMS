# PHASE 0 — BASELINE & FREEZE

**Project**: 3SC CMS Crew Management System  
**Repository**: https://github.com/3secondplk/3SC  
**Date**: 2026-08-15  
**Auditor**: Implementation Engineer (GLM)  
**Verifier**: Independent Security Auditor (GPT)  

---

## A. Executive Summary

The 3SC CMS Crew Management System is a Next.js 16 single-page application for Indonesian retail crew management, sales claiming, TikTok sales tracking, and performance dashboards. The application uses a custom JWT authentication system with SHA-256 password hashing, Prisma ORM with SQLite (configured for PostgreSQL in schema comments), and a component-based frontend built with React 19, Tailwind CSS 4, and shadcn/ui.

**Critical findings**: The application has **8 CRITICAL** and **8 HIGH** severity security issues that must be addressed before any production deployment. The most severe are: (1) 11 API routes have no authentication, exposing all financial data and allowing unauthenticated mutations; (2) passwords are hashed with unsalted SHA-256; (3) hardcoded default admin credentials exist; (4) TypeScript build errors are silently ignored; (5) the Caddy gateway has an SSRF vulnerability via `XTransformPort`.

---

## B. Current Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│                    Caddy Gateway (:81)                │
│  ┌─────────────────────────────────────────────────┐ │
│  │  XTransformPort → reverse_proxy localhost:{port}│ │  ← SSRF VULNERABILITY
│  │  default         → reverse_proxy localhost:3000 │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────┐
│               Next.js 16 (Turbopack) :3000            │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Client SPA (React 19)                          │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │Dashboard│ │ Claims  │ │ TikTok  │          │ │
│  │  └─────────┘ └─────────┘ └─────────┘          │ │
│  │  ┌─────────┐ ┌─────────┐                       │ │
│  │  │Mgmt     │ │ Export  │                       │ │
│  │  └─────────┘ └─────────┘                       │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │  API Routes (26 endpoints)                      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │ │
│  │  │/api/auth │ │/api/claim│ │/api/dash │       │ │
│  │  └──────────┘ └──────────┘ └──────────┘       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │ │
│  │  │/api/crew │ │/api/group│ │/api/data │       │ │
│  │  └──────────┘ └──────────┘ └──────────┘       │ │
│  │  ┌──────────┐ ┌──────────┐                     │ │
│  │  │/api/tt   │ │/api/exp  │                     │ │
│  │  └──────────┘ └──────────┘                     │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Auth Layer (custom JWT)                        │ │
│  │  - HS256 HMAC signing                          │ │
│  │  - admin_token httpOnly cookie                  │ │
│  │  - 7-day expiry, no refresh/revocation         │ │
│  │  - SHA-256 password hashing (INSECURE)         │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────┐
│               Prisma ORM → SQLite (dev.db)            │
│  ┌────────┐ ┌───────┐ ┌──────┐ ┌──────────────┐   │
│  │ Admin  │ │ Group │ │ Crew │ │ Sale         │   │
│  │        │ │       │ │      │ │ TikTokSale   │   │
│  │        │ │       │ │      │ │ ActivityLog  │   │
│  └────────┘ └───────┘ └──────┘ └──────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## C. Repository Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                         # Main SPA (~1610 lines)
│   └── api/
│       ├── route.ts                     # Health check
│       ├── activity-log/route.ts
│       ├── auth/
│       │   ├── route.ts                 # POST login, GET verify, DELETE logout
│       │   ├── change-password/route.ts
│       │   └── setup/route.ts           # Auto-create default admin
│       ├── claims/
│       │   ├── route.ts                 # POST upload, GET list, PUT claim, PATCH edit, DELETE
│       │   ├── search/route.ts
│       │   ├── programs/route.ts
│       │   ├── bulk-edit/route.ts
│       │   ├── bulk-unclaim/route.ts
│       │   └── unclaim/route.ts
│       ├── crews/
│       │   ├── route.ts                 # CRUD
│       │   └── batch-import/route.ts
│       ├── dashboard/
│       │   ├── route.ts                 # Dashboard stats
│       │   └── group-detail/route.ts
│       ├── data/
│       │   ├── clear-all/route.ts
│       │   ├── export/route.ts
│       │   ├── export-all/route.ts
│       │   └── import/route.ts
│       ├── export/route.ts
│       ├── groups/route.ts
│       ├── management/report/route.ts
│       ├── tiktok-crews/route.ts
│       └── tiktok-sales/
│           ├── route.ts
│           ├── export/route.ts
│           └── import/route.ts
├── components/
│   ├── claims/ClaimsTab.tsx
│   ├── dashboard/DashboardTab.tsx
│   ├── export/ExportTab.tsx
│   ├── management/ManagementTab.tsx, CrewForm.tsx, GroupForm.tsx, etc.
│   ├── modals/
│   ├── tiktok/TikTokSalesTab.tsx
│   ├── ui/ (40+ shadcn/ui components)
│   ├── KeyboardShortcutsHelp.tsx
│   ├── NotificationCenter.tsx
│   └── theme-provider.tsx
├── hooks/
│   ├── use-mobile.ts
│   └── use-toast.ts
└── lib/
    ├── activity-logger.ts
    ├── auth.ts
    ├── cms-types.ts
    ├── cms-utils.tsx
    ├── db.ts
    └── utils.ts
```

---

## D. API Inventory

### D.1 Health Check

| Method | Path | Auth? | AuthZ? | Validation? | DB? | Mutation? | Sensitive? | Rate Limit? | Audit Log? | Risk |
|--------|------|-------|--------|-------------|-----|-----------|------------|-------------|------------|------|
| GET | `/api` | No | No | N/A | No | No | No | No | No | LOW |

### D.2 Authentication

| Method | Path | Auth? | AuthZ? | Validation? | DB? | Mutation? | Sensitive? | Rate Limit? | Audit Log? | Risk |
|--------|------|-------|--------|-------------|-----|-----------|------------|-------------|------------|------|
| POST | `/api/auth` | No (by design) | No | Manual: non-empty check | Yes | Yes (cookie, auto-setup) | **PASSWORDS, JWT** | **No** | Yes | **CRITICAL** |
| GET | `/api/auth` | Yes (JWT) | No | N/A | No | No | Session info | No | No | LOW |
| DELETE | `/api/auth` | **No** | No | No | No | Yes (clears cookie) | Session | No | Yes | HIGH |
| GET | `/api/auth/setup` | **No** | No | No | Yes | **Yes (creates admin)** | **Credentials** | No | No | **CRITICAL** |
| POST | `/api/auth/change-password` | Yes | No | Manual: non-empty, min 6 chars | Yes | Yes | **Passwords** | No | Yes | HIGH |

### D.3 Claims / Sales

| Method | Path | Auth? | AuthZ? | Validation? | DB? | Mutation? | Sensitive? | Rate Limit? | Audit Log? | Risk |
|--------|------|-------|--------|-------------|-----|-----------|------------|-------------|------------|------|
| POST | `/api/claims` | **No** | No | File type/size, columns | Yes | **Yes (import)** | Financial data | No | Yes | **CRITICAL** |
| GET | `/api/claims` | **No** | No | Pagination | Yes | No | **All sales data** | No | No | **CRITICAL** |
| PUT | `/api/claims` | **No** | No | saleIds ≤500 | Yes | **Yes (claim)** | Financial | No | Yes | **CRITICAL** |
| PATCH | `/api/claims` | **No** | No | saleIds, fields | Yes | **Yes (edit)** | Financial | No | No | **CRITICAL** |
| DELETE | `/api/claims` | **No** | No | ID | Yes | **Yes (delete)** | Financial | No | Yes | **CRITICAL** |
| GET | `/api/claims/search` | **No** | No | Pagination, limit ≤100 | Yes | No | **Sales + crew** | No | No | HIGH |
| GET | `/api/claims/programs` | **No** | No | No | Yes | No | Program names | No | No | MEDIUM |
| PUT | `/api/claims/bulk-edit` | Yes | No | saleIds ≤500, field whitelist | Yes | Yes | Financial | No | Yes | MEDIUM |
| PUT | `/api/claims/bulk-unclaim` | Yes | No | saleIds ≤500 | Yes | Yes | Moderate | No | Yes | MEDIUM |
| PUT | `/api/claims/unclaim` | **No** | No | saleIds ≤500 | Yes | **Yes** | Moderate | No | Yes | HIGH |

### D.4 Dashboard

| Method | Path | Auth? | AuthZ? | Validation? | DB? | Mutation? | Sensitive? | Rate Limit? | Audit Log? | Risk |
|--------|------|-------|--------|-------------|-----|-----------|------------|-------------|------------|------|
| GET | `/api/dashboard` | **No** | No | No | Yes (heavy) | No | **ALL financial data** | No | No | **CRITICAL** |
| GET | `/api/dashboard/group-detail` | **No** | No | groupId | Yes (very heavy) | No | **Detailed financials** | No | No | **CRITICAL** |

### D.5 Crews & Groups

| Method | Path | Auth? | AuthZ? | Validation? | DB? | Mutation? | Sensitive? | Rate Limit? | Audit Log? | Risk |
|--------|------|-------|--------|-------------|-----|-----------|------------|-------------|------------|------|
| GET | `/api/crews` | **No** | No | No | Yes | No | **Crew PII + stats** | No | No | HIGH |
| POST | `/api/crews` | Yes | No | Required fields, length limits | Yes | Yes | Crew PII | No | Yes | MEDIUM |
| PUT | `/api/crews` | Yes | No | Required fields, length limits | Yes | Yes | Crew PII | No | **No** | MEDIUM |
| DELETE | `/api/crews` | Yes | No | ID | Yes | Yes | No | No | Yes | MEDIUM |
| POST | `/api/crews/batch-import` | Yes | No | File type/size, ≤500 rows | Yes | Yes | Crew PII | No | **No** | MEDIUM |
| GET/POST/PUT/DELETE | `/api/groups` | Yes (all) | No | Name required, targets numeric | Yes | Yes | Group targets | No | Partial | MEDIUM |

### D.6 TikTok Sales

| Method | Path | Auth? | AuthZ? | Validation? | DB? | Mutation? | Sensitive? | Rate Limit? | Audit Log? | Risk |
|--------|------|-------|--------|-------------|-----|-----------|------------|-------------|------------|------|
| GET | `/api/tiktok-sales` | **No** | No | Pagination | Yes | No | **Financial data** | No | No | **CRITICAL** |
| POST | `/api/tiktok-sales` | **No** | No | Required fields | Yes | **Yes** | Financial | No | Yes | **CRITICAL** |
| PUT | `/api/tiktok-sales` | **No** | No | ID | Yes | **Yes** | Financial | No | Yes | **CRITICAL** |
| DELETE | `/api/tiktok-sales` | **No** | No | IDs (no max count) | Yes | **Yes (batch)** | Financial | No | Yes | **CRITICAL** |
| GET | `/api/tiktok-crews` | **No** (intentional) | No | No | Yes | No | Crew PII | No | No | HIGH |
| POST | `/api/tiktok-sales/import` | **No** | No | File type/size, ≤5000 rows | Yes | **Yes (import)** | Financial | No | Yes | **CRITICAL** |
| GET | `/api/tiktok-sales/export` | **No** | No | take ≤50000 | Yes | No | **ALL TikTok data** | No | Yes | **CRITICAL** |

### D.7 Data Management

| Method | Path | Auth? | AuthZ? | Validation? | DB? | Mutation? | Sensitive? | Rate Limit? | Audit Log? | Risk |
|--------|------|-------|--------|-------------|-----|-----------|------------|-------------|------------|------|
| DELETE | `/api/data/clear-all` | Yes | No | No | Yes | **Yes (NUKE ALL)** | **ALL data** | No | Yes | HIGH |
| POST | `/api/data/import` | Yes | No | JSON structure | Yes | **Yes (upsert + optional clear)** | Full DB | No | **No** | HIGH |
| GET | `/api/data/export-all` | Yes | No | No | Yes (ALL tables) | No | **Full DB dump** | No | **No** | HIGH |
| GET | `/api/data/export` | Yes | No | take ≤50000 | Yes | No | Full backup | No | **No** | HIGH |
| GET | `/api/export` | Yes | No | take ≤50000, date filter | Yes | No | Sales CSV | No | **No** | MEDIUM |

### D.8 Other

| Method | Path | Auth? | AuthZ? | Validation? | DB? | Mutation? | Sensitive? | Rate Limit? | Audit Log? | Risk |
|--------|------|-------|--------|-------------|-----|-----------|------------|-------------|------------|------|
| GET | `/api/management/report` | Yes | No | Pagination | Yes | No | Financial + crew | No | No | MEDIUM |
| GET | `/api/activity-log` | Yes | No | limit ≤100 | Yes | No | Audit metadata | No | No | LOW |

---

## E. Authentication Flow

```
1. User submits username/password to POST /api/auth
2. Server checks if Admin table is empty → auto-creates admin/admin123 (INSECURE)
3. Server hashes password with SHA-256 (INSECURE - unsalted, fast)
4. Server compares hashes with === (timing attack risk)
5. On match: creates JWT with HS256 HMAC, payload: {adminId, username, name}
6. Sets httpOnly cookie: admin_token, maxAge=7days, sameSite=lax, secure=prod
7. Client stores isAdmin=true in React state (cosmetic only)
8. Subsequent requests: browser sends cookie automatically
9. Protected routes call requireAuth() which verifies JWT
10. Logout: DELETE /api/auth clears cookie (no token revocation)
```

**Findings**:
- **F-AUTH-001**: SHA-256 password hashing — not a KDF, no salt, no iterations
- **F-AUTH-002**: Hardcoded default admin/admin123 credentials in auto-setup
- **F-AUTH-003**: No rate limiting on login endpoint
- **F-AUTH-004**: No token revocation mechanism (7-day validity, no blacklist)
- **F-AUTH-005**: JWT secret falls back to hardcoded dev value `cms-crew-dev-secret-local-only`
- **F-AUTH-006**: DELETE /api/auth has no auth check — anyone can trigger logout
- **F-AUTH-007**: `requireAuth()` does not throw/enforce — caller must manually check null

---

## F. Authorization Flow

**There is no authorization system.** All authenticated users have identical access. There is:
- No role system
- No permission model
- No RBAC/ABAC
- No superadmin vs viewer distinction
- Any authenticated admin can: delete all data, export all data, import data, manage crews/groups

**Finding**:
- **F-AUTHZ-001**: Authentication ≡ Authorization. No granular permissions exist.

---

## G. Database Architecture

- **Provider**: SQLite (file:./dev.db) — schema comments reference PostgreSQL
- **Connection**: Prisma singleton via `src/lib/db.ts`
- **No connection pooling** (not needed for SQLite, required for PostgreSQL)
- **No read replicas**
- **No backup/PITR strategy**

### Schema Models:
| Model | Records | Relations | Indexes |
|-------|---------|-----------|---------|
| Admin | ~1 | None | username@unique |
| Group | ~3 | → Crew[] | None |
| Crew | ~6 | → Group, → Sale[], → TikTokSale[] | employeeId@unique |
| Sale | ~215 | → Crew? | tanggal, kodeExtend, crewId, program, (tanggal+kodeExtend), idPenjualan |
| TikTokSale | ~0 | → Crew? | tanggal, crewId, status, idOrder |
| ActivityLog | ~varies | None | None |

---

## H. Prisma Schema Assessment

| Finding | Severity | Detail |
|---------|----------|--------|
| Cascade delete on Group→Crew | HIGH | Deleting a group deletes all crews; their sales are orphaned (SetNull) |
| No @unique on Group.name | MEDIUM | Duplicate group names possible |
| tanggal as String not DateTime | MEDIUM | No DB-level date validation, locale/format issues |
| No soft-delete pattern | MEDIUM | Hard deletes with no recovery |
| No created/updated timestamps on Sale | LOW | No audit trail for individual sales mutations |
| No foreign key index on Sale.crewId | LOW | Already indexed separately |

---

## I. PostgreSQL Current Dependency

The schema is configured for SQLite but was originally designed for PostgreSQL (Neon/Supabase/Railway). The `schema.postgresql.prisma` file exists in the repo. PostgreSQL features like row-level security, TLS connections, and advisory locks are not available in SQLite.

**Status**: UNVERIFIED for production PostgreSQL deployment.

---

## J. Import/Export Architecture

| Feature | Route | Auth? | Max Size | Validation | Risk |
|---------|-------|-------|----------|------------|------|
| Claims Excel upload | POST /api/claims | **No** | 4MB | File type, columns, dedup | **CRITICAL** |
| Crew CSV/XLSX import | POST /api/crews/batch-import | Yes | 500 rows | File type, length limits, dedup | MEDIUM |
| TikTok XLSX/CSV import | POST /api/tiktok-sales/import | **No** | 10MB, 5000 rows | File type, status whitelist, dedup | **CRITICAL** |
| Sales CSV export | GET /api/export | Yes | 50000 rows | Date filter | MEDIUM |
| TikTok CSV export | GET /api/tiktok-sales/export | **No** | 50000 rows | None | **CRITICAL** |
| JSON backup export | GET /api/data/export | Yes | All data | None | HIGH |
| Full DB export | GET /api/data/export-all | Yes | All tables | None | HIGH |
| JSON import | POST /api/data/import | Yes | No limit | JSON structure | HIGH |
| Clear all data | DELETE /api/data/clear-all | Yes | N/A | None | HIGH |

---

## K. Deployment/Runtime Architecture

- **Development**: `next dev -p 3000` with Turbopack
- **Production build**: `prisma generate && next build`
- **PM2**: ecosystem.config.cjs referenced but NOT present in current repo
- **Vercel**: vercel.json referenced but NOT present in current repo
- **PWA**: manifest.json with standalone display mode
- **Gateway**: Caddy on port 81, proxies to Next.js on port 3000
- **No Docker/containerization** configuration found
- **No CI/CD pipeline** found

---

## L. Environment/Secrets Assessment

| Variable | Configured? | Exposed? | Committed? | Risk |
|----------|-------------|----------|------------|------|
| `DATABASE_URL` | Yes (.env) | No | No (.gitignore) | LOW |
| `NEXT_AUTH_SECRET` | **No** (.env missing) | Hardcoded fallback in source | Yes (dev fallback) | **CRITICAL** |
| `NODE_ENV` | No explicit setting | N/A | No | MEDIUM |

**Finding**:
- **F-ENV-001**: `NEXT_AUTH_SECRET` not set in .env; falls back to hardcoded `cms-crew-dev-secret-local-only` in development, empty string in production
- **F-ENV-002**: No .env.example file for onboarding

---

## M. Security Findings

### CRITICAL

| ID | Finding | Location | Evidence | Impact | Fix | Phase |
|----|---------|----------|----------|--------|-----|-------|
| SEC-001 | 11 API routes unauthenticated | /api/claims, /api/dashboard, /api/tiktok-sales/*, /api/claims/unclaim, /api/auth/setup | No requireAuth() call in route handlers | Full data exposure, unauthenticated mutations | Add requireAuth() to all protected routes | Phase 1 |
| SEC-002 | SHA-256 password hashing (unsalted) | auth/route.ts, auth/setup/route.ts, auth/change-password/route.ts, seed.ts | crypto.createHash('sha256') | Rainbow table, GPU brute force trivial | Replace with bcrypt/argon2 | Phase 1 |
| SEC-003 | Hardcoded default admin/admin123 | auth/route.ts:57-69, auth/setup/route.ts, seed.ts | Auto-setup creates known credentials | Anyone can login on fresh deploy | Remove auto-setup, require env-based initial credentials | Phase 1 |
| SEC-004 | ignoreBuildErrors: true | next.config.ts | typescript: { ignoreBuildErrors: true } | Broken code ships to production | Set to false, fix type errors | Phase 1 |
| SEC-005 | Caddy SSRF via XTransformPort (UNVERIFIED) | Caddyfile | reverse_proxy localhost:{query.XTransformPort} — **UNVERIFIED**: requires evidence of exact Caddyfile path, whether tracked by repository, whether used in production, source of XTransformPort, proof of exploitability, whether it is application infrastructure or sandbox infrastructure | Access to any local service (unverified) | Do NOT modify Caddy yet — provide evidence first | Phase 2 (infra) |
| SEC-006 | NEXT_AUTH_SECRET not configured | .env, auth.ts, auth/route.ts | Falls back to hardcoded dev secret | JWT can be forged in dev | Require env var, fail without it | Phase 1 |
| SEC-007 | /api/auth/setup unauthenticated admin creation | auth/setup/route.ts | No auth check, creates admin with known password | Backdoor on fresh deploy | Gate with setup token or disable after init | Phase 1 |
| SEC-008 | No rate limiting anywhere | All routes | No rate limit implementation | Brute force, DoS, abuse | Implement rate limiting | Phase 1 |

### HIGH

| ID | Finding | Location | Evidence | Impact | Fix | Phase |
|----|---------|----------|----------|--------|-----|-------|
| SEC-009 | DELETE /api/auth unauthenticated | auth/route.ts (DELETE handler) | No requireAuth() before cookie clear | **Medium impact**: An unauthenticated DELETE to /api/auth only clears the caller's own cookie (httpOnly, bound to the request). It does NOT invalidate the JWT server-side or terminate another user's session. The real risk is minimal — a third party cannot forcibly log out another user. The fix is still applied for defense-in-depth. | Add auth check | Phase 1 |
| SEC-010 | No role/permission system | All routes | Authenticated ≡ authorized | Any admin can nuke all data | Create role abstraction | Phase 1 |
| SEC-011 | No input validation on many endpoints | dashboard, tiktok-sales, etc. | Query params passed directly | Injection, DoS | Add Zod schemas | Phase 1 |
| SEC-012 | Cascade delete Group→Crew | schema.prisma | onDelete: Cascade | Accidental mass deletion | Use Restrict or soft-delete | Phase 2 |
| SEC-013 | No CSRF/origin validation | All mutation endpoints | Cookie auth, no CSRF token | Cross-origin attacks | Add origin checks | Phase 1 |
| SEC-014 | prisma in production dependencies | package.json | "prisma": "^6.11.1" in deps | Increased attack surface | Move to devDependencies | Phase 1 |
| SEC-015 | Error detail leakage | tiktok-sales routes, dashboard/group-detail | detail: msg in 500 responses | Internal error info exposed | Generic error messages | Phase 1 |
| SEC-016 | Unvalidated sort field / parameter handling | /api/tiktok-sales, /api/claims | sortField query parameter passed directly to Prisma orderBy | Without validation, arbitrary field names could be passed to Prisma orderBy, potentially exposing internal field names or causing unexpected behavior. This is NOT "Prisma injection" — Prisma's orderBy does not execute raw queries. However, unvalidated parameters should always be constrained to an explicit whitelist. | Use explicit sort field whitelist mapping (CLAIM_SORT_FIELDS, TIKTOK_SORT_FIELDS) | Phase 1 |

### MEDIUM

| ID | Finding | Location | Evidence | Impact | Fix | Phase |
|----|---------|----------|----------|--------|-----|-------|
| SEC-017 | 7-day JWT expiry, no refresh | auth/route.ts | JWT_EXPIRY_MS = 7 days | Long token lifetime increases stolen-token exposure window. "No token revocation" is not by itself a vulnerability — the real concern is: (1) 7-day token lifetime, (2) stolen token exposure, (3) lack of session invalidation strategy. Reduce access token lifetime to 8h. Do NOT build complex revocation system in Phase 1 — document Phase 2 session strategy instead. | Reduce to 8h (Phase 1); design session/refresh strategy (Phase 2) | Phase 1/2 |
| SEC-018 | noImplicitAny: false | tsconfig.json | Explicit override of strict | Type safety bypass | Set to true | Phase 1 |
| SEC-019 | reactStrictMode: false | next.config.ts | Explicitly disabled | Missed stale closure bugs | Set to true | Phase 1 |
| SEC-020 | ESLint rules disabled (25+) | eslint.config.mjs | no-explicit-any:off, exhaustive-deps:off, etc. | No static analysis safety net | Re-enable critical rules | Phase 1 |
| SEC-021 | tanggal as String not DateTime | schema.prisma | Sale.tanggal: String | No DB date validation | Change to DateTime | Phase 2 |
| SEC-022 | No security headers | next.config.ts | No headers() export | Clickjacking, MIME sniffing, etc. | Add security headers | Phase 1 |
| SEC-023 | next-auth dependency unused | package.json | Imported but not used | Confusion, dead weight | Remove | Phase 1 |
| SEC-024 | db:push with --accept-data-loss | package.json scripts | "db:push": "prisma db push --accept-data-loss" | Silent data loss in schema drift | Remove flag | Phase 1 |

---

## N. Scalability Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| SQLite single-file DB | HIGH | No concurrent writes, no replication, no horizontal scaling |
| No connection pooling | MEDIUM | Required for PostgreSQL HA (Phase 2) |
| Dashboard query is very heavy | MEDIUM | /api/dashboard loads all groups, crews, sales in single request |
| No pagination on some list endpoints | MEDIUM | /api/crews GET returns all crews |
| No caching layer | LOW | Every request hits DB directly |
| Large component files | LOW | DashboardTab (114KB), ClaimsTab (100KB) — slow initial compile |

---

## O. Availability Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| Single server, no redundancy | HIGH | No failover, no load balancing |
| SQLite file corruption risk | HIGH | No WAL/journal mode configured, no backup |
| No health check endpoint | MEDIUM | /api only returns "hello", no DB/dependency checks |
| No graceful shutdown | MEDIUM | No SIGTERM handler |
| No process supervision | MEDIUM | No PM2 config, no systemd service |

---

## P. Current Single Points of Failure

1. **SQLite database file** — single file on disk, no replication
2. **Next.js dev server** — single process, no clustering
3. **Caddy gateway** — single instance, no HA
4. **Admin table** — single admin user, no backup admin
5. **No backup/restore procedure** — data loss is permanent

---

## Q. Technical Debt

1. **page.tsx is 1610 lines** — should be split into smaller components
2. **TypeScript errors ignored at build** — type safety is effectively disabled
3. **ESLint effectively a no-op** — 25+ rules disabled
4. **No test suite** — zero test files found
5. **No middleware.ts** — auth is enforced per-route, not globally
6. **JWT_SECRET duplicated** in auth.ts and auth/route.ts
7. **Schema datasource mismatch** — comments say PostgreSQL, actual is SQLite
8. **Unused next-auth dependency** — confusing signal about auth architecture
9. **No CI/CD pipeline** — no automated testing or deployment
10. **No .env.example** — onboarding requires source code reading

---

## R. Recommended Phase 1 Changes

1. **P0.1**: Add `requireAuth()` to all 11 unprotected API routes
2. **P0.2**: Create role/permission abstraction (prepare for future RBAC)
3. **P0.3**: Remove hardcoded credentials, require env-based initial setup
4. **P0.4**: Replace SHA-256 with bcrypt for password hashing
5. **P0.5**: Harden JWT: require NEXT_AUTH_SECRET, reduce expiry, add auth check to logout
6. **P0.6**: Implement rate limiting (login: 5/min, API: 60/min)
7. **P0.7**: Add Zod input validation to all API routes
8. **P0.8**: Add security headers (CSP, HSTS, X-Frame-Options, etc.)
9. **P0.9**: Add CSRF/origin validation for mutation endpoints
10. **P0.10**: Set ignoreBuildErrors: false, noImplicitAny: true
11. **P0.11**: Add security audit logging for all sensitive events

---

## S. Things That MUST NOT Be Changed Yet

1. **Database provider** — SQLite must remain until Phase 2 PostgreSQL migration
2. **Prisma ORM** — do not switch to another ORM
3. **Next.js framework** — do not migrate to another framework
4. **UI component library** — shadcn/ui must remain
5. **Single-tenant model** — do not implement multi-tenancy yet
6. **No read replicas or connection pooling** — Phase 2
7. **No queue/worker architecture** — Phase 2
8. **No Docker/containerization** — Phase 2
9. **No CI/CD pipeline creation** — Phase 2
10. **No data sharding/partitioning** — Phase 2
11. **Schema date field types** — changing tanggal to DateTime is Phase 2 (breaking migration)
12. **Cascade delete behavior** — Phase 2 (requires soft-delete pattern)
