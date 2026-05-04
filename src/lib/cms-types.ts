// ─── CMS Crew Management System — Shared Types ─────────

export interface CrewStat {
  id: string; name: string; photo: string | null; employeeId: string
  groupId: string; groupName: string; groupLogo: string | null
  todayTotal: number; todayQty: number; todayStruk: number
  weekTotal: number; weekQty: number; weekStruk: number
  monthTotal: number; monthQty: number; monthStruk: number
  allTimeTotal: number; allTimeQty: number; allTimeStruk: number
  transactionCount: number
  // Target info derived from group (monthlyTarget / crewCount)
  crewMonthlyTarget: number
  crewMonthlyAchievement: number // percentage
  crewWeeklyTargets: number[] // [W1, W2, W3, W4] target amounts
  crewCurrentWeekTarget: number // this week's target amount
  crewWeeklyAchievement: number // percentage vs current week target
  currentWeek: number
  // Group raw targets for reference
  groupMonthlyTarget: number
  groupWeeklyTargetPcts: number[] // [W1%, W2%, W3%, W4%]
}

export interface GroupAchievement {
  id: string; name: string; logo: string | null
  monthlyTarget: number; monthlyTotal: number; monthlyAchievement: number
  weeklyTarget: number; weeklyTotal: number; weeklyAchievement: number
  weekTargetPct: number; currentWeek: number; crewCount: number
  // Per-crew target breakdown
  crewMonthlyTarget: number // monthlyTarget / crewCount
  weeklyTargetPcts: number[] // [W1%, W2%, W3%, W4%]
  crewWeeklyTargets: number[] // [W1, W2, W3, W4] per-crew amounts
}

export interface RecentSale {
  id: string; tanggal: string; kodeExtend: string; qty: number; settle: number
  crew: { name: string; photo: string | null; group: { name: string } }
}

export interface TrendData {
  previousValue: number; changePercent: number | null; direction: 'up' | 'down' | 'same'
}

export interface DashboardData {
  crewStats: CrewStat[]; totals: {
    // Claimed-only period totals (sales assigned to crews)
    today: number; week: number; month: number; todayQty: number; weekQty: number; monthQty: number
    // ALL imported data totals (from Excel, including unclaimed)
    totalTransactions: number; totalSettle: number; totalQty: number
    importedToday: number; importedTodayQty: number
    importedWeek: number; importedWeekQty: number
    importedMonth: number; importedMonthQty: number
  }
  trends: { today: TrendData; week: TrendData; month: TrendData }
  groupAchievements: GroupAchievement[]; topCrews: CrewStat[]; recentSales: RecentSale[]
  dateInfo: { today: string; currentWeek: number; weekStart: number; weekEnd: number; currentMonth: number; currentYear: number }
  lastWeekTotals: { settle: number; qty: number; transactions: number } | null
  claimedCount: number; unclaimedCount: number
}

export interface Crew {
  id: string; name: string; photo: string | null; employeeId: string; groupId: string
  group: { id: string; name: string }; totalSales: number; totalQty: number; todaySales: number; transactionCount: number
}

export interface Group {
  id: string; name: string; logo: string | null; monthlyTarget: number
  week1Target: number; week2Target: number; week3Target: number; week4Target: number
  crewCount: number; crews: Crew[]
}

export interface ClaimSale {
  id: string; tanggal: string; kodeExtend: string; qty: number; settle: number
  idPenjualan: string | null
  brand: string; dept: string; modul: string; program: string; pembayaran: string
  createdAt: string; claimedAt: string | null
  crew: { id: string; name: string; employeeId: string; photo: string | null } | null
}

export interface GroupDetailCrew {
  id: string; name: string; photo: string | null; employeeId: string
  totalQty: number; totalSettle: number; totalStruk: number
  basketSize: number; pricePoint: number; itemCount: number
  // Target info
  crewMonthlyTarget: number
  crewCurrentWeekTarget: number
  crewMonthlyAchievement: number
  crewWeeklyAchievement: number
}

export interface GroupDetailData {
  group: { id: string; name: string; logo: string | null; monthlyTarget: number }
  period: string; periodKey: string
  crews: GroupDetailCrew[]
  groupTotal: { qty: number; settle: number; struk: number; basketSize: number; pricePoint: number }
  // Target info
  crewMonthlyTarget: number // monthlyTarget / crewCount
  weeklyTargetPcts: number[] // [W1%, W2%, W3%, W4%]
  crewWeeklyTargets: number[] // [W1, W2, W3, W4] per-crew amounts
  currentWeek: number
}

export interface ScanResult {
  tanggal: string; kodeExtend: string; qty: number; settle: number
  brand: string; dept: string; modul: string; pembayaran: string; program: string
}

/** Shape of persisted claim filters in localStorage */
export interface ClaimFilters {
  claimDateFrom: string
  claimDateTo: string
  claimSearch: string
  claimFilterProgram: string
  claimFilterCrew: string
  claimShowClaimed: 'unclaimed' | 'claimed' | 'all'
}

/** Delete confirmation dialog state */
export interface DeleteConfirmState {
  type: 'crew' | 'group' | 'sale' | 'batch-sale'
  ids?: string[]
  id?: string
  name: string
}
