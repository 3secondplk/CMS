// ─────────────────────────────────────────────────────────
// Application Snapshot Script
//
// Creates a JSON snapshot of application data (NOT a database backup).
// Distinguishes:
//   - DATABASE BACKUP: pg_dump binary (use backup-postgres.ts)
//   - APPLICATION SNAPSHOT: JSON export of app data (this script)
//   - DISASTER RECOVERY: Database backup + snapshot + schema migration
//
// Usage:
//   bun run scripts/snapshot-app.ts
//
// Environment:
//   DATABASE_URL   — PostgreSQL connection string
//   SNAPSHOT_DIR   — Directory to store snapshots (default: ./snapshots)
//
// Snapshot metadata includes:
//   - timestamp
//   - source (database host/name)
//   - database version
//   - schema version (Prisma migration state)
//   - checksum (SHA-256 of JSON content)
//   - retention status
//
// Snapshots are NOT stored inside the application repository.
// ─────────────────────────────────────────────────────────

import { mkdirSync, existsSync, readdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { PrismaClient } from '@prisma/client'

function getEnv(key: string, defaultVal?: string): string {
  const val = process.env[key] || defaultVal
  if (!val) {
    console.error(`ERROR: Environment variable ${key} is required`)
    process.exit(1)
  }
  return val
}

async function main() {
  const snapshotDir = getEnv('SNAPSHOT_DIR', './snapshots')
  const retentionCount = parseInt(getEnv('SNAPSHOT_RETENTION', '5'), 10)

  mkdirSync(snapshotDir, { recursive: true })

  const db = new PrismaClient()

  try {
    const now = new Date()
    const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 15)
    const filename = `snapshot_${timestamp}.json`
    const filepath = join(snapshotDir, filename)

    console.log('══════════════════════════════════════════════════')
    console.log('Application Snapshot')
    console.log('══════════════════════════════════════════════════')

    // Get PostgreSQL version
    let pgVersion = 'unknown'
    try {
      const versionResult = await db.$queryRaw<Array<{ version: string }>>`SELECT version() as version`
      pgVersion = versionResult[0]?.version?.split(',')[0] || 'unknown'
    } catch {
      // Non-critical
    }

    // Get schema version (latest migration)
    let schemaVersion = 'unknown'
    try {
      const migrations = await db.$queryRaw<Array<{ migration_name: string; finished_at: Date }>>`
        SELECT migration_name, finished_at FROM _prisma_migrations
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC LIMIT 1
      `
      schemaVersion = migrations[0]?.migration_name || 'unknown'
    } catch {
      // _prisma_migrations may not be accessible
    }

    // Export data
    console.log('Exporting data...')
    const [admins, groups, crews, sales, tiktokSales] = await Promise.all([
      db.admin.findMany({ select: { id: true, username: true, name: true, createdAt: true, updatedAt: true } }),
      db.group.findMany(),
      db.crew.findMany(),
      db.sale.findMany({ take: 100000 }),
      db.tikTokSale.findMany({ take: 100000 }),
    ])

    // Parse DB source from DATABASE_URL
    const dbUrl = getEnv('DATABASE_URL')
    const sourceMatch = dbUrl.match(/@([^/]+)\/([^?]+)/)
    const source = sourceMatch ? `${sourceMatch[1]}/${sourceMatch[2]}` : 'unknown'

    const snapshotData = {
      version: 1,
      exportedAt: now.toISOString(),
      source,
      databaseVersion: pgVersion,
      schemaVersion,
      counts: {
        admins: admins.length,
        groups: groups.length,
        crews: crews.length,
        sales: sales.length,
        tiktokSales: tiktokSales.length,
      },
      data: {
        admins,
        groups,
        crews,
        sales,
        tiktokSales,
      },
    }

    // Serialize and compute checksum
    const jsonContent = JSON.stringify(snapshotData, null, 2)
    const checksum = createHash('sha256').update(jsonContent).digest('hex')

    // Write snapshot
    writeFileSync(filepath, jsonContent)
    const fileSize = Buffer.byteLength(jsonContent)

    // Write metadata
    const metadata = {
      timestamp: now.toISOString(),
      source,
      databaseVersion: pgVersion,
      schemaVersion,
      filename,
      sizeBytes: fileSize,
      sizeKB: Math.round(fileSize / 1024),
      checksum,
      checksumAlgorithm: 'sha256',
      format: 'application_snapshot_json',
      retentionStatus: 'active' as const,
      counts: snapshotData.counts,
    }

    const metadataPath = filepath.replace('.json', '.meta.json')
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))

    console.log()
    console.log(`✅ Snapshot created`)
    console.log(`   File:     ${filename}`)
    console.log(`   Size:     ${Math.round(fileSize / 1024)} KB`)
    console.log(`   SHA-256:  ${checksum}`)
    console.log(`   Source:   ${source}`)
    console.log(`   PG:       ${pgVersion}`)
    console.log(`   Schema:   ${schemaVersion}`)
    console.log(`   Counts:   ${JSON.stringify(snapshotData.counts)}`)

    // Apply retention
    const snapshots = readdirSync(snapshotDir)
      .filter(f => f.startsWith('snapshot_') && f.endsWith('.json'))
      .sort()
      .reverse()

    if (snapshots.length > retentionCount) {
      const toDelete = snapshots.slice(retentionCount)
      console.log()
      console.log(`Applying retention (keep ${retentionCount}):`)
      for (const f of toDelete) {
        unlinkSync(join(snapshotDir, f))
        const meta = f.replace('.json', '.meta.json')
        if (existsSync(join(snapshotDir, meta))) {
          unlinkSync(join(snapshotDir, meta))
        }
        console.log(`   Deleted: ${f}`)
      }
    }
  } catch (error) {
    console.error('Snapshot failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
