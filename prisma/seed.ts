// ─────────────────────────────────────────────────────────
// CMS Crew Management System — Database Seed Script
// Idempotent: uses upsert for all records
// ─────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const db = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 0): number {
  const val = Math.random() * (max - min) + min;
  return Number(val.toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ── Seed Data ────────────────────────────────────────────

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD_HASH = sha256("admin123");

const GROUPS = [
  {
    name: "Metro Jaya",
    monthlyTarget: 50_000_000,
    week1Target: 10_000_000,
    week2Target: 12_000_000,
    week3Target: 13_000_000,
    week4Target: 15_000_000,
  },
  {
    name: "Nusantara",
    monthlyTarget: 45_000_000,
    week1Target: 9_000_000,
    week2Target: 11_000_000,
    week3Target: 12_000_000,
    week4Target: 13_000_000,
  },
  {
    name: "Archipelago",
    monthlyTarget: 40_000_000,
    week1Target: 8_000_000,
    week2Target: 10_000_000,
    week3Target: 11_000_000,
    week4Target: 11_000_000,
  },
  {
    name: "Maju Bersama",
    monthlyTarget: 35_000_000,
    week1Target: 7_000_000,
    week2Target: 9_000_000,
    week3Target: 9_000_000,
    week4Target: 10_000_000,
  },
];

const CREWS: { name: string; employeeId: string; groupId: number }[] = [
  // Metro Jaya (0)
  { name: "Budi Santoso", employeeId: "EMP001", groupId: 0 },
  { name: "Siti Rahayu", employeeId: "EMP002", groupId: 0 },
  { name: "Ahmad Hidayat", employeeId: "EMP003", groupId: 0 },
  { name: "Dewi Lestari", employeeId: "EMP004", groupId: 0 },
  // Nusantara (1)
  { name: "Rizky Pratama", employeeId: "EMP005", groupId: 1 },
  { name: "Nurul Aini", employeeId: "EMP006", groupId: 1 },
  { name: "Fajar Setiawan", employeeId: "EMP007", groupId: 1 },
  { name: "Putri Wulandari", employeeId: "EMP008", groupId: 1 },
  // Archipelago (2)
  { name: "Eko Prasetyo", employeeId: "EMP009", groupId: 2 },
  { name: "Rina Marlina", employeeId: "EMP010", groupId: 2 },
  { name: "Hendra Wijaya", employeeId: "EMP011", groupId: 2 },
  { name: "Yuni Astuti", employeeId: "EMP012", groupId: 2 },
  // Maju Bersama (3)
  { name: "Dimas Kurniawan", employeeId: "EMP013", groupId: 3 },
  { name: "Ani Susanti", employeeId: "EMP014", groupId: 3 },
  { name: "Bagus Firmansyah", employeeId: "EMP015", groupId: 3 },
  { name: "Maya Sari", employeeId: "EMP016", groupId: 3 },
];

const BRANDS = [
  "Unilever",
  "Wings",
  "Sasa",
  "ABC",
  "Indomie",
  "Rinso",
  "Dove",
  "Ponds",
  "Sunlight",
  "Lifebuoy",
  "Clear",
  "Garnier",
  "Maggi",
  "Royco",
  "Buavita",
];

const DEPARTMENTS = ["Food", "Personal Care", "Home Care", "Health", "Beverages"];

const MODULES = ["Modern Trade", "General Trade", "Traditional Market", "E-Commerce", "Mini Market"];

const PROGRAMS = ["Promo Awal Bulan", "Bundle Pack", "Buy 2 Get 1", "Diskon 10%", "Normal", "Promo Akhir Tahun", "Flash Sale", "Reguler"];

const PAYMENTS = ["TUNAI", "QRIS", "DEBIT", "KREDIT"];

const CHANNELS = ["GT", "MT", "MINIMARKET", "TRADISIONAL", "ONLINE"];

const SIZES = ["250ml", "500ml", "800ml", "1L", "150g", "250g", "500g", "1kg", "330ml", "600ml"];

const RETENTION_STATUSES = ["Aktif", "Non-Aktif", "Baru", "Lama"];

// ── Main Seed ────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding CMS database...\n");

  // 1. Seed Admin
  console.log("📦 Seeding Admin...");
  const admin = await db.admin.upsert({
    where: { username: ADMIN_USERNAME },
    update: {},
    create: {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD_HASH,
      name: "Administrator",
    },
  });
  console.log(`   ✅ Admin created: ${admin.username}\n`);

  // 2. Seed Groups
  console.log("📦 Seeding Groups...");
  const groupIds: string[] = [];
  for (const g of GROUPS) {
    const group = await db.group.upsert({
      where: { id: g.name },
      update: {},
      create: g,
    });
    groupIds.push(group.id);
    console.log(`   ✅ Group: ${group.name} (target: ${(group.monthlyTarget / 1_000_000).toFixed(0)}M)`);
  }
  console.log("");

  // 3. Seed Crews
  console.log("📦 Seeding Crews...");
  const crewIds: string[] = [];
  for (const c of CREWS) {
    const crew = await db.crew.upsert({
      where: { employeeId: c.employeeId },
      update: {},
      create: {
        name: c.name,
        employeeId: c.employeeId,
        groupId: groupIds[c.groupId],
      },
    });
    crewIds.push(crew.id);
    console.log(`   ✅ Crew: ${crew.name} (${crew.employeeId})`);
  }
  console.log("");

  // 4. Seed Sales (200+)
  console.log("📦 Seeding Sales...");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // Determine current week of month
  const dayOfMonth = now.getDate();
  const currentWeekOfMonth = Math.min(Math.ceil(dayOfMonth / 7), 4);

  const totalSales = 250;
  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < totalSales; i++) {
    // Generate a unique-ish kodeExtend
    const skuNum = String(randomInt(1000, 9999));
    const kodeExtend = `SKU-${skuNum}-${i.toString().padStart(3, "0")}`;

    // Date distribution:
    // ~40% this week, ~35% earlier this month, ~25% last month
    let saleDate: Date;
    const dateRoll = Math.random();
    if (dateRoll < 0.40) {
      // This week
      const weekStart = ((currentWeekOfMonth - 1) * 7) + 1;
      const day = randomInt(weekStart, Math.min(dayOfMonth, currentWeekOfMonth * 7));
      saleDate = new Date(currentYear, currentMonth, day);
    } else if (dateRoll < 0.75) {
      // Earlier this month (before this week)
      const weekStart = ((currentWeekOfMonth - 1) * 7) + 1;
      const day = randomInt(1, Math.max(1, weekStart - 1));
      saleDate = new Date(currentYear, currentMonth, day);
    } else {
      // Last month
      const daysInLastMonth = new Date(lastMonthYear, lastMonth + 1, 0).getDate();
      const day = randomInt(1, daysInLastMonth);
      saleDate = new Date(lastMonthYear, lastMonth, day);
    }

    const tanggal = formatDate(saleDate);
    const qty = randomInt(1, 20);
    const hjp = randomFloat(10000, 500000, 0);
    const netto = hjp * qty;
    const diskonPct = Math.random() < 0.3 ? randomFloat(0, 15, 1) : 0;
    const diskon = diskonPct;
    const diskonRp = Math.round((netto * diskonPct) / 100);
    const potongan = Math.random() < 0.2 ? randomFloat(0, 50000, 0) : 0;
    const potonganV = Math.random() < 0.15 ? randomFloat(0, 30000, 0) : 0;
    const settle = Math.max(0, netto - diskonRp - potongan - potonganV);

    const brand = pick(BRANDS);
    const dept = pick(DEPARTMENTS);
    const modul = pick(MODULES);
    const program = pick(PROGRAMS);
    const pembayaran = pick(PAYMENTS);
    const channel = pick(CHANNELS);
    const ukuran = pick(SIZES);
    const statusRetention = pick(RETENTION_STATUSES);

    const idPenjualan = `SJ-${String(randomInt(100000, 999999))}`;
    const retentionCode = Math.random() < 0.5 ? `RET-${String(randomInt(1000, 9999))}` : null;

    // ~70% claimed to a crew, ~30% unclaimed
    const isClaimed = Math.random() < 0.70;
    const crewId = isClaimed ? pick(crewIds) : null;

    // claimedAt: some have it, some don't
    let claimedAt: Date | null = null;
    if (crewId && Math.random() < 0.85) {
      claimedAt = new Date(saleDate.getTime() + randomInt(0, 3) * 86400000);
    }

    try {
      await db.sale.create({
        data: {
          tanggal,
          idPenjualan,
          statusRetention,
          retentionCode,
          kodeExtend,
          brand,
          dept,
          modul,
          ukuran,
          qty,
          hjp,
          netto,
          diskon,
          diskonRp,
          potongan,
          potonganV,
          settle,
          pembayaran,
          program,
          channelStock: channel,
          crewId,
          claimedAt,
        },
      });
      createdCount++;
    } catch {
      skippedCount++;
    }
  }

  console.log(`   ✅ Sales seeded: ${createdCount} created, ${skippedCount} skipped\n`);

  // 5. Summary
  const [adminCount, groupCount, crewCount, saleCount] = await Promise.all([
    db.admin.count(),
    db.group.count(),
    db.crew.count(),
    db.sale.count(),
  ]);

  console.log("═══════════════════════════════════════");
  console.log("  Seed Complete!");
  console.log(`  Admin:  ${adminCount}`);
  console.log(`  Groups: ${groupCount}`);
  console.log(`  Crews:  ${crewCount}`);
  console.log(`  Sales:  ${saleCount}`);
  console.log("═══════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
