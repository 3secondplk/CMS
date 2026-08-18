// ─────────────────────────────────────────────────────────
// PostgreSQL Backup Script
//
// Usage:
//   bun run scripts/backup-postgres.ts
//
// Environment:
//   DATABASE_URL — PostgreSQL connection string
//   BACKUP_DIR  — Directory to store backups (default: ./backups)
//
// Backup strategy:
//   - Type: pg_dump custom format (compressed, -Fc)
//   - Naming: cms3sc_YYYYMMDD_HHMMSS.backup
//   - Retention: Keep last N backups (default: 7)
//   - Verification: Check file size > 0 after dump
//
// Requirements: pg_dump must be available in PATH
// ─────────────────────────────────────────────────────────

import { execSync } from 'child_process'
import { mkdirSync, existsSync, readdirSync, unlinkSync, statSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

function getEnv(key: string, defaultVal?: string): string {
  const val = process.env[key] || defaultVal
  if (!val) {
    console.error(`ERROR: Environment variable ${key} is required`)
    process.exit(1)
  }
  return val
}

function parseDatabaseUrl(url: string) {
  // postgresql://user:password@host:port/database?params
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/)
  if (!match) {
    console.error('ERROR: Cannot parse DATABASE_URL. Expected format: postgresql://user:pass@host:port/db')
    process.exit(1)
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5],
  }
}

function main() {
  const databaseUrl = getEnv('DATABASE_URL')
  const backupDir = getEnv('BACKUP_DIR', './backups')
  const retentionCount = parseInt(getEnv('BACKUP_RETENTION', '7'), 10)

  const db = parseDatabaseUrl(databaseUrl)

  // Ensure backup directory exists
  mkdirSync(backupDir, { recursive: true })

  // Generate backup filename
  const now = new Date()
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 15)
  const filename = `${db.database}_${timestamp}.backup`
  const filepath = join(backupDir, filename)

  console.log(`══════════════════════════════════════════════════`)
  console.log(`PostgreSQL Backup`)
  console.log(`══════════════════════════════════════════════════`)
  console.log(`Database:  ${db.database}`)
  console.log(`Host:      ${db.host}:${db.port}`)
  console.log(`Backup to: ${filepath}`)
  console.log(`Retention: ${retentionCount} backups`)
  console.log()

  // Execute pg_dump
  const env = {
    ...process.env,
    PGPASSWORD: db.password,
  }

  try {
    const cmd = `pg_dump -Fc -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} -f "${filepath}"`
    console.log(`Running: pg_dump -Fc ...`)
    execSync(cmd, { env, stdio: 'pipe' })
  } catch (error) {
    console.error('ERROR: pg_dump failed')
    console.error(error)
    process.exit(1)
  }

  // Verify backup
  if (!existsSync(filepath)) {
    console.error('ERROR: Backup file was not created')
    process.exit(1)
  }

  const fileSize = statSync(filepath).size
  if (fileSize === 0) {
    console.error('ERROR: Backup file is empty')
    unlinkSync(filepath)
    process.exit(1)
  }

  // Compute checksum
  const fileBuffer = readFileSync(filepath)
  const checksum = createHash('sha256').update(fileBuffer).digest('hex')

  console.log()
  console.log(`✅ Backup successful`)
  console.log(`   File:     ${filename}`)
  console.log(`   Size:     ${(fileSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`   SHA-256:  ${checksum}`)

  // Write metadata file
  const metadata = {
    timestamp: now.toISOString(),
    source: `${db.host}:${db.port}/${db.database}`,
    database: db.database,
    filename,
    sizeBytes: fileSize,
    sizeMB: parseFloat((fileSize / 1024 / 1024).toFixed(2)),
    checksum,
    checksumAlgorithm: 'sha256',
    format: 'pg_dump_custom',
    schemaVersion: 'unknown', // Filled by app if available
    retentionStatus: 'active',
  }

  const metadataPath = filepath.replace('.backup', '.meta.json')
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
  console.log(`   Metadata: ${metadataPath}`)

  // Apply retention policy
  const backups = readdirSync(backupDir)
    .filter(f => f.endsWith('.backup') && f.startsWith(db.database))
    .sort()
    .reverse() // newest first

  if (backups.length > retentionCount) {
    const toDelete = backups.slice(retentionCount)
    console.log()
    console.log(`Applying retention policy (keep ${retentionCount}):`)
    for (const f of toDelete) {
      unlinkSync(join(backupDir, f))
      // Also delete metadata
      const meta = f.replace('.backup', '.meta.json')
      if (existsSync(join(backupDir, meta))) {
        unlinkSync(join(backupDir, meta))
      }
      console.log(`   Deleted: ${f}`)
    }
  }

  console.log()
  console.log(`Total backups: ${Math.min(backups.length, retentionCount)}`)
}

main()
