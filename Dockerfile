# ─────────────────────────────────────────────────────────
# Dockerfile — 3SC CMS Crew Management System
# Multi-stage build for minimal image size
# ─────────────────────────────────────────────────────────

FROM node:20-alpine AS base

# Install bun
RUN corepack enable && corepack prepare bun@latest --activate

# ── Dependencies ──
FROM base AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile --production=false

# ── Build ──
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js standalone
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ── Production ──
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema (for db push on first run)
COPY --from=builder /app/prisma ./prisma

# Create db directory
RUN mkdir -p db && chown nextjs:nodejs db

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "bunx prisma db push --skip-generate 2>/dev/null || true && bun server.js"]
