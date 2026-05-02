# CMS Crew Management System — Deployment Guide

**by Ahtjong Labs**

---

## 📋 Requirements

- **Node.js** 18+ or **Bun** 1.0+
- **npm** / **bun** package manager

---

## 🚀 Quick Deploy (3 Steps)

### Step 1 — Install Dependencies

```bash
cd CMS
npm install
# or: bun install
```

### Step 2 — Setup Environment

```bash
cp .env.example .env
# Edit .env and set your JWT_SECRET and DATABASE_URL
```

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:../db/custom.db` (SQLite) |
| `JWT_SECRET` | JWT signing secret | `change-this-to-a-random-32-char-string` |
| `NEXT_PUBLIC_APP_URL` | App public URL | `http://localhost:3000` |

### Step 3 — Initialize Database & Run

```bash
# Generate Prisma client
npx prisma generate
# or: bunx prisma generate

# Push schema to database
npx prisma db push
# or: bunx prisma db push

# (Optional) Seed sample data
npx prisma db seed
# or: bunx prisma db seed

# Start production server
npm run build
npm run start
# or: bun run build && bun run start
```

The app will be available at **http://localhost:3000**

---

## 🌐 Deploy to Vercel

1. Push this repo to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` — Your PostgreSQL connection string (e.g. Neon)
   - `JWT_SECRET` — A random 32+ character string
   - `NEXT_PUBLIC_APP_URL` — Your Vercel deployment URL
4. Switch Prisma schema to PostgreSQL:
   ```bash
   cp prisma/schema.postgresql.prisma prisma/schema.prisma
   ```
5. Deploy

> **Note**: Vercel build config is already in `vercel.json`

---

## 🔐 Default Login

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

> ⚠️ **Change the default password after first login!**

---

## 📁 Project Structure

```
CMS/
├── prisma/
│   ├── schema.prisma          # Database schema (SQLite)
│   ├── schema.postgresql.prisma # PostgreSQL schema for Vercel
│   └── seed.ts                # Sample data seeder
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main SPA (Dashboard, Claims, Management)
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles + animations
│   │   └── api/               # API routes
│   │       ├── auth/route.ts
│   │       ├── dashboard/route.ts
│   │       ├── claims/route.ts
│   │       ├── crews/route.ts
│   │       ├── groups/route.ts
│   │       ├── export/route.ts
│   │       └── activity-logs/route.ts
│   ├── components/ui/         # shadcn/ui components
│   ├── hooks/                 # Custom hooks
│   └── lib/
│       ├── db.ts              # Prisma client
│       ├── activity-log.ts    # Activity logging helper
│       └── utils.ts           # Utility functions
├── public/                    # Static assets (icons, manifest)
├── .env.example               # Environment template
├── next.config.ts             # Next.js config (standalone + PWA)
├── vercel.json                # Vercel deployment config
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.mjs
└── package.json
```

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router, Standalone Output)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM (SQLite / PostgreSQL)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Auth**: JWT (Stateless)
- **PWA**: @ducanh2912/next-pwa
- **Export**: xlsx library

---

## 📝 Database Schema

- **Admin**: id, username, password (SHA-256), name
- **Group**: id, name, logo, monthlyTarget, week1-4Targets
- **Crew**: id, name, photo, employeeId, groupId → Group
- **Sale**: id, crewId → Crew, tanggal, kodeExtend, brand, dept, modul, qty, settle, pembayaran, program, claimedAt
- **ActivityLog**: id, action, detail, adminName, createdAt

---

## ⚡ Features

- **Dashboard** — Sales analytics, group performance, leaderboard
- **Claim System** — Import sales (Excel/CSV), claim/unclaim, batch operations
- **Management** — CRUD for crews and groups
- **Activity Log** — Full audit trail of all actions
- **Export** — CSV data export
- **PWA** — Installable as mobile app
- **Responsive** — Mobile-first design

---

## 📄 License

Private — Ahtjong Labs
