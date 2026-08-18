# CMS3SC — Vercel Deployment Guide

## ⚠️ Safety Notice

This package uses **only safe migration commands**:
- ✅ `prisma migrate deploy` — applies pending migrations only, never drops data
- ❌ ~~`prisma migrate reset`~~ — **NOT included** (destroys all data)
- ❌ ~~`prisma db push --accept-data-loss`~~ — **NOT included** (can drop columns/tables)

## Prerequisites

1. **PostgreSQL database** — Use one of:
   - [Neon](https://neon.tech) (recommended, serverless PostgreSQL)
   - [Supabase](https://supabase.com)
   - [Railway](https://railway.app)
   - Any PostgreSQL 12+ with pg_trgm support

2. **Vercel account** — [vercel.com](https://vercel.com)

## Step 1: Extract ZIP

```bash
unzip cms3sc-vercel-deploy.zip -d cms3sc
cd cms3sc
```

## Step 2: Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/cms3sc?sslmode=require` | ✅ Yes |
| `NEXT_AUTH_SECRET` | Generate: `openssl rand -base64 48` | ✅ Yes |

**DATABASE_URL examples:**
```
# Neon
postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/cms3sc?sslmode=require

# Supabase
postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres

# Railway
postgresql://postgres:pass@xxx.railway.app:5432/railway
```

## Step 3: Deploy to Vercel

### Option A: Vercel CLI (Recommended)
```bash
npm i -g vercel
vercel login
npm install
npx prisma migrate deploy   # Safe: only applies pending migrations
vercel --prod
```

### Option B: GitHub
1. Push to GitHub repository
2. Import in Vercel Dashboard → New Project
3. Framework Preset: **Next.js**
4. Build Command: `prisma generate && next build`
5. Install Command: `npm install`
6. After first deploy, run migration:
   ```bash
   npx prisma migrate deploy
   ```

## Step 4: Seed Initial Admin

After first deployment, create the initial admin:

```bash
curl -X POST https://your-app.vercel.app/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-secure-password","name":"Administrator"}'
```

## Step 5: Verify

```bash
# Health check
curl https://your-app.vercel.app/api/health
# → {"status":"ok","db":{"ok":true}}

# Liveness
curl https://your-app.vercel.app/api/health/live
# → {"status":"alive"}

# Readiness
curl https://your-app.vercel.app/api/health/ready
# → {"status":"ready"}
```

## Optional: pg_trgm Indexes

For optimal search performance (Phase 5), pg_trgm indexes are included in the migration.
Neon and Supabase have pg_trgm pre-enabled. For self-hosted PostgreSQL:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

The migration `20260315000000_pg_trgm_gin_indexes` will create the GIN indexes automatically.

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `postinstall` | `prisma generate` | Generates Prisma Client (auto-run by npm) |
| `build` | `prisma generate && next build` | Production build |
| `db:migrate:deploy` | `prisma migrate deploy` | **Safe** — applies pending migrations only |
| `db:migrate:status` | `prisma migrate status` | Check migration status |
| `db:generate` | `prisma generate` | Regenerate Prisma Client |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails: Prisma Client could not be generated | Ensure `postinstall: "prisma generate"` is in package.json scripts |
| 500 error: P1001 Can't reach database | Check DATABASE_URL is correct and database is accessible |
| 500 error: NEXT_AUTH_SECRET not configured | Set NEXT_AUTH_SECRET in Vercel environment variables |
| Migration fails: pg_trgm not available | Neon/Supabase: pre-enabled. Self-hosted: install postgresql-contrib package |
| "Column does not exist" after schema change | Run `npx prisma migrate deploy` to apply pending migrations |
