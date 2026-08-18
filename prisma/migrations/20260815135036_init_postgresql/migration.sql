-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "monthlyTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "week1Target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "week2Target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "week3Target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "week4Target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "week5Target" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiktokActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crew" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo" TEXT,
    "employeeId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Crew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "crewId" TEXT,
    "tanggal" TEXT NOT NULL,
    "idPenjualan" TEXT,
    "statusRetention" TEXT,
    "retentionCode" TEXT,
    "kodeExtend" TEXT NOT NULL,
    "brand" TEXT,
    "dept" TEXT,
    "modul" TEXT,
    "ukuran" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "hjp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diskon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diskonRp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "potongan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "potonganV" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "settle" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pembayaran" TEXT,
    "program" TEXT,
    "channelStock" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TikTokSale" (
    "id" TEXT NOT NULL,
    "crewId" TEXT,
    "tanggal" TEXT NOT NULL,
    "idOrder" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pengiriman',
    "artikel" TEXT NOT NULL,
    "size" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "settle" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "crewName" TEXT,
    "saleId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Crew_employeeId_key" ON "Crew"("employeeId");

-- CreateIndex
CREATE INDEX "Sale_tanggal_idx" ON "Sale"("tanggal");

-- CreateIndex
CREATE INDEX "Sale_kodeExtend_idx" ON "Sale"("kodeExtend");

-- CreateIndex
CREATE INDEX "Sale_crewId_idx" ON "Sale"("crewId");

-- CreateIndex
CREATE INDEX "Sale_program_idx" ON "Sale"("program");

-- CreateIndex
CREATE INDEX "Sale_tanggal_kodeExtend_idx" ON "Sale"("tanggal", "kodeExtend");

-- CreateIndex
CREATE INDEX "Sale_idPenjualan_idx" ON "Sale"("idPenjualan");

-- CreateIndex
CREATE INDEX "TikTokSale_tanggal_idx" ON "TikTokSale"("tanggal");

-- CreateIndex
CREATE INDEX "TikTokSale_crewId_idx" ON "TikTokSale"("crewId");

-- CreateIndex
CREATE INDEX "TikTokSale_status_idx" ON "TikTokSale"("status");

-- CreateIndex
CREATE INDEX "TikTokSale_idOrder_idx" ON "TikTokSale"("idOrder");

-- AddForeignKey
ALTER TABLE "Crew" ADD CONSTRAINT "Crew_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TikTokSale" ADD CONSTRAINT "TikTokSale_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"("id") ON DELETE SET NULL ON UPDATE CASCADE;
