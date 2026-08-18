// ─────────────────────────────────────────────────────────
// PostgreSQL Restore Verification Script
//
// Usage:
//   bun run scripts/restore-verify.ts
//
// Environment:
//   DATABASE_URL — PostgreSQL connection string (restored DB)
//
// A backup is NOT considered valid until restoration is tested.
//
// This script verifies:
//   1. Schema — All expected tables exist
//   2. Row counts — Each table has expected minimum rows
//   3. FK integrity — No orphaned foreign key references
//   4. Indexes — Expected indexes exist
//   5. Application connectivity — Prisma can query the database
//
// Exit codes:
//   0 = all checks pass
//   1 = verification failures
//   2 = connection error
// ─────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const EXPECTED_TABLES = ['Admin', 'Group', 'Crew', 'Sale', 'TikTokSale', 'ActivityLog']

const MIN_ROW_COUNTS: Record<string, number> = {
  Admin: 1,
  Group: 1,
  Crew: 1,
  // Sale, TikTokSale, ActivityLog can be 0 after fresh restore
}

interface CheckResult {
  name: string
  passed: boolean
  details: string
}

async function main() {
  const results: CheckResult[] = []

  console.log('══════════════════════════════════════════════════')
  console.log('PostgreSQL Restore Verification')
  console.log('══════════════════════════════════════════════════')
  console.log()

  // ── 1. Schema Verification ──
  console.log('1. Schema Verification')
  try {
    const tables = await db.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `
    const tableNames = tables.map(t => t.tablename)
    for (const expected of EXPECTED_TABLES) {
      const exists = tableNames.includes(expected)
      results.push({
        name: `schema:${expected}`,
        passed: exists,
        details: exists ? 'exists' : 'MISSING',
      })
      console.log(`   ${exists ? '✅' : '❌'} Table "${expected}": ${exists ? 'exists' : 'MISSING'}`)
    }
  } catch (e) {
    console.error('   ❌ Cannot query pg_tables:', e)
    results.push({ name: 'schema', passed: false, details: 'query failed' })
  }
  console.log()

  // ── 2. Row Count Verification ──
  console.log('2. Row Count Verification')
  const models = [
    { name: 'Admin', count: () => db.admin.count() },
    { name: 'Group', count: () => db.group.count() },
    { name: 'Crew', count: () => db.crew.count() },
    { name: 'Sale', count: () => db.sale.count() },
    { name: 'TikTokSale', count: () => db.tikTokSale.count() },
    { name: 'ActivityLog', count: () => db.activityLog.count() },
  ]

  for (const model of models) {
    try {
      const rowCount = await model.count()
      const min = MIN_ROW_COUNTS[model.name] ?? 0
      const passed = rowCount >= min
      results.push({
        name: `rowCount:${model.name}`,
        passed,
        details: `rows=${rowCount}, min=${min}`,
      })
      console.log(`   ${passed ? '✅' : '❌'} ${model.name}: ${rowCount} rows (min: ${min})`)
    } catch (e) {
      results.push({ name: `rowCount:${model.name}`, passed: false, details: 'query failed' })
      console.log(`   ❌ ${model.name}: query failed`)
    }
  }
  console.log()

  // ── 3. FK Integrity Verification ──
  console.log('3. FK Integrity Verification')
  try {
    const orphanedCrewGroup = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Crew" c
      WHERE NOT EXISTS (SELECT 1 FROM "Group" g WHERE g.id = c."groupId")
    `
    const crewGroupOrphans = Number(orphanedCrewGroup[0]?.count ?? 0)
    results.push({
      name: 'fk:Crew.groupId',
      passed: crewGroupOrphans === 0,
      details: `${crewGroupOrphans} orphaned refs`,
    })
    console.log(`   ${crewGroupOrphans === 0 ? '✅' : '❌'} Crew.groupId → Group.id: ${crewGroupOrphans} orphans`)

    const orphanedSaleCrew = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Sale" s
      WHERE s."crewId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Crew" c WHERE c.id = s."crewId")
    `
    const saleCrewOrphans = Number(orphanedSaleCrew[0]?.count ?? 0)
    results.push({
      name: 'fk:Sale.crewId',
      passed: saleCrewOrphans === 0,
      details: `${saleCrewOrphans} orphaned refs`,
    })
    console.log(`   ${saleCrewOrphans === 0 ? '✅' : '❌'} Sale.crewId → Crew.id: ${saleCrewOrphans} orphans`)

    const orphanedTkSaleCrew = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "TikTokSale" t
      WHERE t."crewId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Crew" c WHERE c.id = t."crewId")
    `
    const tkSaleCrewOrphans = Number(orphanedTkSaleCrew[0]?.count ?? 0)
    results.push({
      name: 'fk:TikTokSale.crewId',
      passed: tkSaleCrewOrphans === 0,
      details: `${tkSaleCrewOrphans} orphaned refs`,
    })
    console.log(`   ${tkSaleCrewOrphans === 0 ? '✅' : '❌'} TikTokSale.crewId → Crew.id: ${tkSaleCrewOrphans} orphans`)
  } catch (e) {
    console.error('   ❌ FK check failed:', e)
    results.push({ name: 'fk', passed: false, details: 'query failed' })
  }
  console.log()

  // ── 4. Index Verification ──
  console.log('4. Index Verification')
  try {
    const indexes = await db.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma_%'
    `
    const indexNames = indexes.map(i => i.indexname)
    const expectedIndexes = [
      'Admin_pkey', 'Admin_username_key',
      'Group_pkey',
      'Crew_pkey', 'Crew_employeeId_key',
      'Sale_pkey', 'Sale_tanggal_idx', 'Sale_kodeExtend_idx',
      'Sale_crewId_idx', 'Sale_program_idx',
      'Sale_tanggal_kodeExtend_idx', 'Sale_idPenjualan_idx',
      'TikTokSale_pkey', 'TikTokSale_tanggal_idx',
      'TikTokSale_crewId_idx', 'TikTokSale_status_idx',
      'TikTokSale_idOrder_idx',
      'ActivityLog_pkey',
    ]
    let allIndexesOk = true
    for (const expected of expectedIndexes) {
      const exists = indexNames.includes(expected)
      if (!exists) allIndexesOk = false
      console.log(`   ${exists ? '✅' : '⚠️'} ${expected}: ${exists ? 'exists' : 'MISSING'}`)
    }
    results.push({
      name: 'indexes',
      passed: allIndexesOk,
      details: `${indexNames.length} indexes found, ${expectedIndexes.length} expected`,
    })
  } catch (e) {
    console.error('   ❌ Index check failed:', e)
    results.push({ name: 'indexes', passed: false, details: 'query failed' })
  }
  console.log()

  // ── 5. Application Connectivity ──
  console.log('5. Application Connectivity')
  try {
    await db.$queryRaw`SELECT 1`
    results.push({ name: 'connectivity', passed: true, details: 'SELECT 1 succeeded' })
    console.log('   ✅ Prisma can query the database')
  } catch (e) {
    results.push({ name: 'connectivity', passed: false, details: 'SELECT 1 failed' })
    console.log('   ❌ Prisma cannot query the database')
  }
  console.log()

  // ── Summary ──
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log('══════════════════════════════════════════════════')
  console.log(`Summary: ${passed} passed, ${failed} failed`)
  console.log('══════════════════════════════════════════════════')

  if (failed > 0) {
    console.log()
    console.log('Failed checks:')
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  ❌ ${r.name}: ${r.details}`)
    }
  }

  await db.$disconnect()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(2)
})
