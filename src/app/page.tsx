'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import {
  LayoutDashboard, Upload, Settings, Trophy, Medal, Target, TrendingUp,
  Users, Crown, Star, Zap, ArrowUpRight, ArrowDownRight, Plus, Trash2,
  Edit2, LogOut, Search, FileSpreadsheet, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, DollarSign, ShoppingCart, BarChart3,
  Calendar, Award, Flame, CircleDot, Package, Clock, Shield,
  Sun, Moon, AlertTriangle, UploadCloud, X, Download, Sparkles, Eye, RefreshCw, Percent, ChevronUp, UserCheck,
  Layers, Monitor, Tablet, Smartphone, Code2, Beaker, Briefcase, Heart,
  CalendarDays, CalendarRange, Hand, PartyPopper, GripVertical, SlidersHorizontal, ChevronDown, Bell,
  CreditCard, QrCode, Wallet, Info, Globe, Activity, Printer, Keyboard, HelpCircle

} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────
interface CrewStat {
  id: string; name: string; photo: string | null; employeeId: string
  groupId: string; groupName: string; groupLogo: string | null
  todayTotal: number; todayQty: number; todayStruk: number
  weekTotal: number; weekQty: number; weekStruk: number
  monthTotal: number; monthQty: number; monthStruk: number
  allTimeTotal: number; allTimeQty: number; allTimeStruk: number
  transactionCount: number
  // Crew target system
  crewMonthlyTarget: number
  crewWeeklyTarget: number
  monthlyAchievement: number
  weeklyAchievement: number
  weekTargets: number[]
  weekAchievements: number[]
  groupCrewCount: number
}

interface GroupAchievement {
  id: string; name: string; logo: string | null
  monthlyTarget: number; monthlyTotal: number; monthlyAchievement: number
  weeklyTarget: number; weeklyTotal: number; weeklyAchievement: number
  weekTargetPct: number; currentWeek: number; crewCount: number
}

interface RecentSale {
  id: string; tanggal: string; kodeExtend: string; qty: number; settle: number
  crew: { name: string; photo: string | null; group: { name: string } }
}

interface TrendData {
  previousValue: number; changePercent: number | null; direction: 'up' | 'down' | 'same'
}

interface DashboardData {
  crewStats: CrewStat[]; totals: { today: number; week: number; month: number; todayQty: number; weekQty: number; monthQty: number }
  trends: { today: TrendData; week: TrendData; month: TrendData }
  groupAchievements: GroupAchievement[]; topCrews: CrewStat[]; recentSales: RecentSale[]
  deptBreakdown: { dept: string; totalSettle: number; totalQty: number; count: number }[]
  dateInfo: { today: string; currentWeek: number; weekStart: number; weekEnd: number; currentMonth: number; currentYear: number }
}

interface Crew {
  id: string; name: string; photo: string | null; employeeId: string; groupId: string
  group: { id: string; name: string }; totalSales: number; totalQty: number; todaySales: number; transactionCount: number
}

interface Group {
  id: string; name: string; logo: string | null; monthlyTarget: number
  week1Target: number; week2Target: number; week3Target: number; week4Target: number
  crewCount: number; crews: Crew[]
}

interface ClaimSale {
  id: string; tanggal: string; kodeExtend: string; qty: number; settle: number
  brand: string; dept: string; modul: string; program: string; pembayaran: string
  ukuran: string | null; hjp: number; netto: number; diskon: number; diskonRp: number
  potongan: number; potonganV: number; idPenjualan: string | null
  statusRetention: string | null; retentionCode: string | null; channelStock: string | null
  createdAt: string; claimedAt: string | null
  crew: { id: string; name: string; employeeId: string; photo: string | null } | null
}

interface GroupDetailCrew {
  id: string; name: string; photo: string | null; employeeId: string
  totalQty: number; totalSettle: number; totalStruk: number
  basketSize: number; pricePoint: number; itemCount: number
}

interface GroupDetailData {
  group: { id: string; name: string; logo: string | null; monthlyTarget: number }
  period: string; periodKey: string
  crews: GroupDetailCrew[]
  groupTotal: { qty: number; settle: number; struk: number; basketSize: number; pricePoint: number }
}

interface ScanResult {
  tanggal: string; kodeExtend: string; qty: number; settle: number
  brand: string; dept: string; modul: string; pembayaran: string; program: string
}

// ─── Helpers ─────────────────────────────────────────────
const fmtRp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
const fmtNum = (n: number) => new Intl.NumberFormat('id-ID').format(n)

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } }
const stagger = { animate: { transition: { staggerChildren: 0.06 } } }
const tabTransition = { initial: { opacity: 0, y: 16, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -10, scale: 0.99 }, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
const inViewFadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' as const }, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }

function getWIBDate() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 7 * 3600000)
}

function getWIBToday() {
  const d = getWIBDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const currentYear = new Date().getFullYear()

// ─── Smart Pagination Helper ─────────────────────────────
function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (currentPage > 3) pages.push('...')
  const start = Math.max(2, currentPage - 2)
  const end = Math.min(totalPages - 1, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  if (currentPage < totalPages - 2) pages.push('...')
  pages.push(totalPages)
  return pages
}

// ─── Claim Page Helpers ───────────────────────────────
function timeAgo(dateStr: string): string {
  const ago = Date.now() - new Date(dateStr).getTime()
  if (ago < 60000) return 'baru saja'
  if (ago < 3600000) return `${Math.floor(ago / 60000)}m lalu`
  if (ago < 86400000) return `${Math.floor(ago / 3600000)}j lalu`
  return new Date(dateStr).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const deptColorMap = ['bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500']
function getDeptColor(dept: string): string {
  let hash = 0
  for (let i = 0; i < dept.length; i++) hash = dept.charCodeAt(i) + ((hash << 5) - hash)
  return deptColorMap[Math.abs(hash) % deptColorMap.length]
}

function getPaymentBadgeClass(pembayaran: string): string {
  const p = pembayaran.toLowerCase()
  if (p.includes('qris') || p.includes('qr')) return 'tag-chip-payment-qr'
  if (p.includes('debit')) return 'tag-chip-payment-debit'
  if (p.includes('credit') || p.includes('kredit')) return 'tag-chip-payment-credit'
  if (p.includes('cash') || p.includes('tunai')) return 'tag-chip-payment-cash'
  return 'tag-chip-payment'
}

function getPaymentIcon(pembayaran: string) {
  const p = pembayaran.toLowerCase()
  if (p.includes('qris') || p.includes('qr')) return <QrCode className="w-3 h-3" />
  if (p.includes('debit')) return <CreditCard className="w-3 h-3" />
  if (p.includes('credit') || p.includes('kredit')) return <CreditCard className="w-3 h-3" />
  if (p.includes('cash') || p.includes('tunai')) return <Wallet className="w-3 h-3" />
  return null
}

function getWeekRange(): { from: string; to: string } {
  const now = getWIBDate()
  const dayOfMonth = now.getDate()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Month-based weeks (same as dashboard API): Week 1 = 1-7, Week 2 = 8-14, etc.
  let currentWeek = 1
  if (dayOfMonth <= 7) currentWeek = 1
  else if (dayOfMonth <= 14) currentWeek = 2
  else if (dayOfMonth <= 21) currentWeek = 3
  else currentWeek = 4

  const weekStart = (currentWeek - 1) * 7 + 1
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const weekEnd = currentWeek === 4 ? daysInMonth : Math.min(currentWeek * 7, daysInMonth)

  const fmt = (d: number) => `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return { from: fmt(weekStart), to: fmt(weekEnd) }
}

function getMonthRange(): { from: string; to: string } {
  const now = getWIBDate()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const fmt = (d: number) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return { from: fmt(1), to: fmt(lastDay) }
}

// ─── Safe Fetch with Timeout (8s, Vercel has 10s serverless limit) ──
async function safeFetch(url: string, opts?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ─── Achievement Color Helper ──────────────────────────
function getAchievementColor(pct: number): { bar: string; text: string; bg: string } {
  if (pct >= 100) return { bar: 'bg-gradient-to-r from-emerald-400 to-teal-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/50' }
  if (pct >= 75) return { bar: 'bg-gradient-to-r from-emerald-500 to-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/50' }
  if (pct >= 50) return { bar: 'bg-gradient-to-r from-amber-400 to-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/50' }
  return { bar: 'bg-gradient-to-r from-rose-400 to-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950/50' }
}

// ─── Animated Counter ────────────────────────────────────
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const [pulsing, setPulsing] = useState(false)
  const prevValue = useRef(value)
  useEffect(() => {
    if (prevValue.current !== value) {
      setPulsing(true)
      setTimeout(() => setPulsing(false), 600)
    }
    prevValue.current = value
  }, [value])
  useEffect(() => {
    const isNeg = value < 0
    let start = 0
    const end = Math.abs(value)
    const duration = 1200
    const stepTime = 16
    const steps = duration / stepTime
    const increment = end / steps
    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      // Ease-out cubic for smooth deceleration
      const progress = currentStep / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(eased * end)
      if (progress >= 1) { setDisplay(isNeg ? -end : end); clearInterval(timer) }
      else setDisplay(current * (isNeg ? -1 : 1))
    }, stepTime)
    return () => clearInterval(timer)
  }, [value])
  return <span className={pulsing ? 'counter-pulse' : ''}>{prefix}{fmtNum(Math.abs(display))}{suffix}</span>
}

// ─── Skeleton Loader ────────────────────────────────────
function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 skeleton-shimmer-premium w-full" style={{ maxWidth: i === 0 ? '80px' : '120px' }} />
        </td>
      ))}
    </tr>
  )
}

function SkeletonCard() {
  return (
    <div className="p-3 rounded-xl border bg-white dark:bg-gray-900 animate-pulse card-hover-glow">
      <div className="h-3 skeleton-shimmer-premium w-3/4 mb-2" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-2.5 skeleton-shimmer-premium w-12" />
        <div className="h-2.5 skeleton-shimmer-premium w-20" />
        <div className="h-2.5 skeleton-shimmer-premium w-12" />
        <div className="h-2.5 skeleton-shimmer-premium w-16" />
      </div>
    </div>
  )
}

// ─── Achievement Badge ───────────────────────────────────
function AchievementBadge({ pct }: { pct: number }) {
  let color = 'text-sky-600 bg-sky-100 dark:bg-sky-950/50 dark:text-sky-400'
  let label = 'Bronze'
  let icon = <Medal className="w-4 h-4" />
  let shimmer = ''
  if (pct >= 100) { color = 'text-amber-600 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400'; label = '🏆 Legend'; icon = <Trophy className="w-4 h-4" />; shimmer = 'badge-shimmer' }
  else if (pct >= 75) { color = 'text-purple-600 bg-purple-100 dark:bg-purple-950/50 dark:text-purple-400'; label = '💎 Diamond'; icon = <Star className="w-4 h-4" />; shimmer = 'badge-shimmer' }
  else if (pct >= 50) { color = 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950/50 dark:text-yellow-400'; label = '🥇 Gold'; icon = <Award className="w-4 h-4" />; shimmer = 'badge-shimmer' }
  else if (pct >= 25) { color = 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400'; label = '🥈 Silver'; icon = <Medal className="w-4 h-4" /> }
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${color} ${shimmer} achievement-float`}>{icon}{label}</span>
}

// ─── Circular Progress ───────────────────────────────────
function CircularProgress({ value, size = 100, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(value, 100) / 100) * circumference
  const clampedVal = Math.min(Math.max(value, 0), 100)
  
  let strokeColor = '#dc2626' // red
  if (clampedVal >= 75) strokeColor = '#059669' // emerald
  else if (clampedVal >= 50) strokeColor = '#d97706' // amber
  else if (clampedVal >= 25) strokeColor = '#0891b2' // cyan

  return (
    <div className="relative inline-flex items-center justify-center circular-progress-glow" style={{ width: size, height: size, '--progress-color': strokeColor } as React.CSSProperties}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeDasharray={circumference} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color: strokeColor }}>{Math.round(clampedVal)}%</span>
      </div>
    </div>
  )
}

// ─── Custom Chart Tooltip ────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string; dataKey?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="chart-tooltip-custom">
      {label && <div className="chart-tooltip-label">{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} className="chart-tooltip-item">
          <span className="chart-tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <span className="chart-tooltip-value">{fmtRp(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────
export default function Home() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isAdmin, setIsAdmin] = useState(false)

  // Prevent hydration mismatch for theme toggle
  useEffect(() => { setMounted(true) }, [])
  // Crew detail panel state
  const [selectedCrewDetail, setSelectedCrewDetail] = useState<CrewStat | null>(null)

  // Group/Zoning detail modal state
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<GroupAchievement | null>(null)
  const [groupDetailData, setGroupDetailData] = useState<GroupDetailData | null>(null)
  const [groupDetailPeriod, setGroupDetailPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [groupDetailLoading, setGroupDetailLoading] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'crew' | 'group' | 'sale' | 'batch-sale'; ids?: string[]; id?: string; name: string } | null>(null)
  const [editSaleDialog, setEditSaleDialog] = useState<ClaimSale | null>(null)
  const [editSaleForm, setEditSaleForm] = useState({ tanggal: '', kodeExtend: '', qty: 0, settle: 0, dept: '', brand: '', modul: '', pembayaran: '', program: '', crewId: '' })
  const [editSaleSaving, setEditSaleSaving] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [showNotif, setShowNotif] = useState(false)
  const [showFabMenu, setShowFabMenu] = useState(false)

  // Dashboard state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashPeriod, setDashPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [dashLoading, setDashLoading] = useState(true)

  // Activity log state
  const [activityLogs, setActivityLogs] = useState<Array<{ id: string; action: string; description: string; crewName: string | null; saleId: string | null; metadata: string | null; createdAt: string }>>([])

  // Claims state
  const [crews, setCrews] = useState<Crew[]>([])
  const [claimSales, setClaimSales] = useState<ClaimSale[]>([])
  const [claimTotal, setClaimTotal] = useState(0)
  const [claimTotalPages, setClaimTotalPages] = useState(1)
  const [claimPage, setClaimPage] = useState(1)
  const [claimSearch, setClaimSearch] = useState('')
  const [claimSearchInput, setClaimSearchInput] = useState('') // Separate state for input to prevent glitch
  const todayStr = getWIBToday()
  const [claimDateFrom, setClaimDateFrom] = useState(todayStr)
  const [claimDateTo, setClaimDateTo] = useState(todayStr)
  const [claimFilterProgram, setClaimFilterProgram] = useState('')
  const [claimFilterCrew, setClaimFilterCrew] = useState('')
  const [claimShowClaimed, setClaimShowClaimed] = useState<'unclaimed' | 'claimed' | 'all'>('unclaimed')
  const [claimsLoading, setClaimsLoading] = useState(false)
  const [claimSortField, setClaimSortField] = useState<string>('createdAt')
  const [claimSortDir, setClaimSortDir] = useState<'asc' | 'desc'>('desc')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<{ totalRows: number; totalQty: number; totalSettle: number; uniqueProducts: number; duplicateRows?: number } | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ name: string; size: number; rows: ScanResult[] } | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [bulkClaimProgress, setBulkClaimProgress] = useState(0)
  const [programs, setPrograms] = useState<string[]>([])
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set())
  const [claimCrewSearch, setClaimCrewSearch] = useState('')
  const [selectedClaimCrewId, setSelectedClaimCrewId] = useState('')
  const [claimSummary, setClaimSummary] = useState<{ totalQty: number; totalSettle: number; totalStruk: number; basketSize: number; pricePoint: number } | null>(null)
  const [claimOverview, setClaimOverview] = useState<{ unclaimedCount: number; unclaimedSettle: number; claimedCount: number; claimedSettle: number; todayActivity: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Management state
  const [groups, setGroups] = useState<Group[]>([])
  const [mgmtCrews, setMgmtCrews] = useState<Crew[]>([])
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [editCrew, setEditCrew] = useState<Crew | null>(null)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [mgmtSearch, setMgmtSearch] = useState('')

  // Batch delete state for Laporan
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleting, setBatchDeleting] = useState(false)

  // Sales detail modal state
  const [saleDetailDialog, setSaleDetailDialog] = useState<ClaimSale | null>(null)

  // Claim confirmation dialog state
  const [claimConfirmDialog, setClaimConfirmDialog] = useState(false)

  // Mobile account menu
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Keyboard shortcuts dialog
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false)
  const claimSearchInputRef = useRef<HTMLInputElement>(null)

  // Check auth on mount
  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => {
      if (d.authenticated) setIsAdmin(true)
    }).catch(() => {})
  }, [])

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setDashLoading(true)
    try {
      const r = await safeFetch(`/api/dashboard?period=${dashPeriod}`)
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      setDashboard(d)
    } catch { toast.error('Gagal memuat dashboard') }
    finally { setDashLoading(false) }
  }, [dashPeriod])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // Fetch activity logs
  const fetchActivityLogs = useCallback(async () => {
    try {
      const r = await safeFetch('/api/activity?limit=10')
      const d = await r.json()
      if (Array.isArray(d)) setActivityLogs(d)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchActivityLogs() }, [fetchActivityLogs])

  // Refresh activity logs when switching to dashboard
  useEffect(() => {
    if (activeTab === 'dashboard') fetchActivityLogs()
  }, [activeTab, fetchActivityLogs])

  // Fetch crews for claim form — staggered 300ms after dashboard
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await safeFetch('/api/crews')
        const d = await r.json()
        if (Array.isArray(d)) setCrews(d)
      } catch { /* silent */ }
    }, 300)
    return () => clearTimeout(t)
  }, [])

  // Debounce search: sync claimSearchInput → claimSearch after 350ms delay
  useEffect(() => {
    const t = setTimeout(() => setClaimSearch(claimSearchInput), 350)
    return () => clearTimeout(t)
  }, [claimSearchInput])

  // Fetch claim sales history — staggered 600ms after mount
  const fetchClaims = useCallback(async (page: number) => {
    setClaimsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (claimSearch) params.set('search', claimSearch)
      if (claimDateFrom) params.set('dateFrom', claimDateFrom)
      if (claimDateTo) params.set('dateTo', claimDateTo)
      if (claimFilterProgram) params.set('program', claimFilterProgram)
      if (claimFilterCrew) params.set('crewId', claimFilterCrew)
      if (claimShowClaimed !== 'all') params.set('claimed', claimShowClaimed === 'claimed' ? 'true' : 'false')
      const r = await safeFetch(`/api/claims?${params}`)
      const d = await r.json()
      setClaimSales(d.sales || [])
      setClaimTotal(d.total || 0)
      setClaimTotalPages(d.totalPages || 1)
      setClaimPage(d.page || 1)
      if (d.summary) setClaimSummary(d.summary)
      if (d.overview) setClaimOverview(d.overview)
    } catch { /* silent */ }
    finally { setClaimsLoading(false) }
  }, [claimSearch, claimDateFrom, claimDateTo, claimFilterProgram, claimFilterCrew, claimShowClaimed])

  useEffect(() => { fetchClaims(1) }, [fetchClaims])

  // Fetch programs for filter dropdown — staggered 500ms
  const fetchPrograms = useCallback(async () => {
    try {
      const r = await safeFetch('/api/claims/programs')
      const d = await r.json()
      if (d.programs && Array.isArray(d.programs)) setPrograms(d.programs)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

  // Fetch management data — only when admin tab is active
  const fetchManagement = useCallback(async () => {
    try {
      const [g, c] = await Promise.all([safeFetch('/api/groups').then(r => r.json()), safeFetch('/api/crews').then(r => r.json())])
      if (Array.isArray(g)) setGroups(g)
      if (Array.isArray(c)) setMgmtCrews(c)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { if (isAdmin) fetchManagement() }, [isAdmin, fetchManagement])

  // Auto-refresh on tab switch
  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboard()
    else if (activeTab === 'claims') fetchClaims(1)
    else if (activeTab === 'management' && isAdmin) fetchManagement()
  }, [activeTab, fetchDashboard, fetchClaims, fetchManagement, isAdmin])

  // Scroll listener for back-to-top button
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Live WIB clock
  useEffect(() => {
    const timer = setInterval(() => {
      const d = getWIBDate()
      setCurrentTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Close notification dropdown on outside click
  useEffect(() => {
    if (!showNotif) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-notif-dropdown]')) setShowNotif(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotif])

  // ─── Keyboard Shortcuts ──────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

      // Escape — close all modals/dialogs
      if (e.key === 'Escape') {
        if (showUploadModal) { setShowUploadModal(false); return }
        if (saleDetailDialog) { setSaleDetailDialog(null); return }
        if (editSaleDialog) { setEditSaleDialog(null); return }
        if (deleteConfirm) { setDeleteConfirm(null); return }
        if (claimConfirmDialog) { setClaimConfirmDialog(false); return }
        if (showShortcutsDialog) { setShowShortcutsDialog(false); return }
        if (showNotif) { setShowNotif(false); return }
        if (showFabMenu) { setShowFabMenu(false); return }
        if (showFilterPanel) { setShowFilterPanel(false); return }
        if (showMobileMenu) { setShowMobileMenu(false); return }
        if (selectedSaleIds.size > 0) { setSelectedSaleIds(new Set()); return }
        return
      }

      // Don't trigger shortcuts when typing in inputs (except specific combos)
      if (isInput && !(e.ctrlKey || e.metaKey)) return

      // Ctrl+K or / — Focus search bar on Claims tab
      if (((e.ctrlKey || e.metaKey) && e.key === 'k') || (e.key === '/' && !isInput)) {
        e.preventDefault()
        setActiveTab('claims')
        // Focus the search input after a short delay for the tab to render
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Cari kode"]') as HTMLInputElement
          if (searchInput) searchInput.focus()
        }, 100)
        return
      }

      // Ctrl+U — Open upload modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault()
        if (isAdmin) {
          setActiveTab('claims')
          setTimeout(() => setShowUploadModal(true), 100)
        }
        return
      }

      // 1, 2, 3 — Switch tabs (only when not in input)
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') { setActiveTab('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
        if (e.key === '2') { setActiveTab('claims'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
        if (e.key === '3' && isAdmin) { setActiveTab('management'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
      }

      // Ctrl+E — Export current view
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        if (activeTab === 'claims') {
          handleExportExcel()
        }
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showUploadModal, saleDetailDialog, editSaleDialog, deleteConfirm, claimConfirmDialog, showShortcutsDialog, showNotif, showFabMenu, showFilterPanel, showMobileMenu, selectedSaleIds, isAdmin, activeTab])

  // ─── Auth handlers ────────────────────────────────────
  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { toast.error('Isi username dan password'); return }
    try {
      const r = await safeFetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm) })
      const d = await r.json()
      if (d.error) { toast.error(`${d.error} (HTTP ${r.status})${d.debug ? ' | adminCount: ' + d.debug.adminCount : ''}`); return }
      setIsAdmin(true)
      toast.success(`Selamat datang, ${d.admin.name}!`)
    } catch (e: any) { toast.error('Login gagal: ' + (e.message || 'Network error')) }
  }

  const handleLogout = async () => {
    await safeFetch('/api/auth', { method: 'DELETE' })
    setIsAdmin(false)
    toast.success('Berhasil logout')
  }

  // ─── Claim handlers ───────────────────────────────────
  const processImport = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    // Simulated progress: reading phase
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 85) return prev
        return prev + Math.random() * 15
      })
    }, 200)

    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await safeFetch('/api/claims', { method: 'POST', body: fd })
      const d = await r.json()
      clearInterval(progressInterval)
      setUploadProgress(100)
      if (d.error) { toast.error(d.error); return }
      setUploadResult(d.summary)
      const dupCount = d.summary?.duplicateRows || 0
      if (d.summary?.totalRows === 0 && dupCount > 0) {
        toast.info(`${dupCount} data sudah ada di database — tidak ada data baru`)
      } else if (dupCount > 0) {
        toast.success(`Import berhasil! ${d.summary?.totalRows || 0} data baru — ${dupCount} duplikat dilewati`)
      } else {
        toast.success(`Import berhasil! ${d.summary?.totalRows || 0} data diimpor — Total: ${fmtRp(d.summary?.totalSettle || 0)}`)
      }
      // Reset date filter to "all" so user can see the uploaded data immediately
      setClaimDateFrom('')
      setClaimDateTo('')
      fetchClaims(1)
      fetchDashboard()
      fetchPrograms()
    } catch {
      clearInterval(progressInterval)
      toast.error('Gagal memproses file')
    } finally {
      setUploading(false)
    }
  }

  // Parse Excel file for preview via server-side API (avoids client-side xlsx bundle issues)
  const parseExcelPreview = async (file: File): Promise<ScanResult[]> => {
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await safeFetch('/api/claims/preview', { method: 'POST', body: fd })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        toast.error(d.error || 'Gagal membaca preview file')
        return []
      }
      const d = await r.json()
      return d.previewRows || []
    } catch {
      toast.error('Gagal membaca preview file')
      return []
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Show preview first, then auto-upload
    setUploadResult(null)
    const rows = await parseExcelPreview(file)
    setPreviewFile({ name: file.name, size: file.size, rows })
    // Only proceed with upload if preview succeeded or returned empty (not an error)
    await processImport(file)
    e.target.value = ''
  }

  const handleDropFile = async (file: File) => {
    if (!file) return
    setUploadResult(null)
    const rows = await parseExcelPreview(file)
    setPreviewFile({ name: file.name, size: file.size, rows })
    await processImport(file)
  }

  const handleClaimSales = async (retryCount = 0) => {
    if (selectedSaleIds.size === 0) return
    if (!selectedClaimCrewId) { toast.error('Cari dan pilih crew terlebih dahulu'); return }
    const crew = crews.find(c => c.id === selectedClaimCrewId)
    if (!crew) { toast.error('Crew tidak ditemukan'); return }
    setClaiming(true)
    setBulkClaimProgress(10)
    try {
      setBulkClaimProgress(30)
      const r = await safeFetch('/api/claims', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleIds: Array.from(selectedSaleIds), crewId: crew.id })
      })
      setBulkClaimProgress(70)
      const d = await r.json()
      setBulkClaimProgress(90)

      // ── Handle conflict responses (race condition detected) ──
      if (d.code === 'ALL_CONFLICT') {
        const claimers = [...new Set((d.conflictDetails || []).map((c: { claimedBy: string }) => c.claimedBy))]
        toast.error(`⚠️ Semua data sudah di-claim oleh ${claimers.join(', ')}! Data mungkin sudah diambil oleh device lain.`, { duration: 8000 })
        setSelectedSaleIds(new Set())
        setClaimCrewSearch('')
        setSelectedClaimCrewId('')
        fetchClaims(claimPage)
        return
      }

      if (d.code === 'PARTIAL_CONFLICT') {
        const claimers = [...new Set((d.conflictDetails || []).map((c: { claimedBy: string }) => c.claimedBy))]
        toast.warning(
          `⚡ ${d.claimedCount} berhasil, ${d.conflictCount} sudah di-claim ${claimers.join(', ')} — kemungkinan claim bersamaan dari device lain`,
          { duration: 8000 }
        )
        setSelectedSaleIds(new Set())
        setClaimCrewSearch('')
        setSelectedClaimCrewId('')
        fetchClaims(claimPage)
        fetchDashboard()
        return
      }

      if (d.error) {
        if (retryCount < 2 && !r.ok) {
          const delay = Math.pow(2, retryCount) * 1000
          toast.info(`⏳ Retry ${retryCount + 1} setelah ${delay / 1000}s... (jaringan lambat)`, { duration: delay })
          setClaiming(false)
          setBulkClaimProgress(0)
          await new Promise(resolve => setTimeout(resolve, delay))
          return handleClaimSales(retryCount + 1)
        }
        toast.error(d.error)
        return
      }

      // Full success
      setBulkClaimProgress(100)
      toast.success(`✅ ${d.claimedCount || 0} data berhasil di-claim ke ${crew.name} (${fmtRp(d.totalSettle || 0)})`)
      setSelectedSaleIds(new Set())
      setClaimCrewSearch('')
      setSelectedClaimCrewId('')
      fetchClaims(claimPage)
      fetchDashboard()
    } catch {
      if (retryCount < 1) {
        toast.info('⏳ Koneksi gagal, mencoba lagi...')
        setClaiming(false)
        setBulkClaimProgress(0)
        await new Promise(resolve => setTimeout(resolve, 1500))
        return handleClaimSales(retryCount + 1)
      }
      toast.error('❌ Gagal meng-claim data. Periksa koneksi internet dan coba lagi.')
    } finally { setClaiming(false); setTimeout(() => setBulkClaimProgress(0), 500) }
  }

  const handleUnclaimSale = async (saleId: string) => {
    try {
      const r = await safeFetch('/api/claims/unclaim', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleIds: [saleId] })
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Data berhasil di-unclaim')
      fetchClaims(claimPage)
      fetchDashboard()
    } catch { toast.error('Gagal meng-unclaim data') }
  }

  // Sort claims for Laporan Penjualan (memoized)
  const sortedClaimSales = useMemo(() => [...claimSales].sort((a, b) => {
    const dir = claimSortDir === 'asc' ? 1 : -1
    if (claimSortField === 'tanggal') return dir * a.tanggal.localeCompare(b.tanggal)
    if (claimSortField === 'qty') return dir * (a.qty - b.qty)
    if (claimSortField === 'settle') return dir * (a.settle - b.settle)
    return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }), [claimSales, claimSortField, claimSortDir])

  // Delete a sale record (admin only)
  const handleDeleteSale = async (id: string) => {
    try {
      const r = await fetch(`/api/claims?id=${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(d.message)
      batchSelectedIds.delete(id)
      setBatchSelectedIds(new Set(batchSelectedIds))
      fetchClaims(claimPage)
      fetchDashboard()
    } catch { toast.error('Gagal menghapus data') }
  }

  // Batch delete selected sale records
  const handleBatchDeleteSales = async (ids: string[]) => {
    if (ids.length === 0) return
    setBatchDeleting(true)
    try {
      const results = await Promise.allSettled(
        ids.map(id => fetch(`/api/claims?id=${id}`, { method: 'DELETE' }).then(r => r.json()))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.length - succeeded
      toast.success(`Berhasil menghapus ${succeeded} data${failed > 0 ? ` (${failed} gagal)` : ''}`)
      setBatchSelectedIds(new Set())
      fetchClaims(1)
      fetchDashboard()
    } catch { toast.error('Gagal menghapus data') }
    finally { setBatchDeleting(false) }
  }

  // Open edit sale dialog
  const openEditSale = (sale: ClaimSale) => {
    setEditSaleDialog(sale)
    setEditSaleForm({
      tanggal: sale.tanggal,
      kodeExtend: sale.kodeExtend,
      qty: sale.qty,
      settle: sale.settle,
      dept: sale.dept || '',
      brand: sale.brand || '',
      modul: sale.modul || '',
      pembayaran: sale.pembayaran || '',
      program: sale.program || '',
      crewId: sale.crew?.id || '__none__',
    })
  }

  // Save edited sale
  const handleSaveEditSale = async () => {
    if (!editSaleDialog) return
    setEditSaleSaving(true)
    try {
      const body: Record<string, unknown> = {
        id: editSaleDialog.id,
        tanggal: editSaleForm.tanggal,
        kodeExtend: editSaleForm.kodeExtend,
        qty: Number(editSaleForm.qty),
        settle: Number(editSaleForm.settle),
        dept: editSaleForm.dept,
        brand: editSaleForm.brand,
        modul: editSaleForm.modul,
        pembayaran: editSaleForm.pembayaran,
        program: editSaleForm.program,
        crewId: (editSaleForm.crewId && editSaleForm.crewId !== '__none__') ? editSaleForm.crewId : null,
      }
      const r = await fetch('/api/claims', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Data berhasil diperbarui')
      setEditSaleDialog(null)
      fetchClaims(claimPage)
      fetchDashboard()
    } catch { toast.error('Gagal mengubah data') }
    finally { setEditSaleSaving(false) }
  }

  // Filtered management crews
  const filteredMgmtCrews = useMemo(() => {
    if (!mgmtSearch) return mgmtCrews
    const q = mgmtSearch.toLowerCase()
    return mgmtCrews.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.employeeId.toLowerCase().includes(q) ||
      c.group?.name.toLowerCase().includes(q)
    )
  }, [mgmtCrews, mgmtSearch])

  // Filtered crews for claim crew search dropdown
  const claimCrewResults = useMemo(() => {
    if (!claimCrewSearch || claimCrewSearch.length < 1) return []
    const q = claimCrewSearch.toLowerCase()
    return crews.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.employeeId.toLowerCase().includes(q)
    ).slice(0, 5)
  }, [claimCrewSearch, crews])

  const filteredGroups = useMemo(() => {
    if (!mgmtSearch) return groups
    const q = mgmtSearch.toLowerCase()
    return groups.filter(g =>
      g.name.toLowerCase().includes(q)
    )
  }, [groups, mgmtSearch])

  // ─── Claim computed values ───────────────────────────
  const claimStats = useMemo(() => {
    const unclaimedInPage = claimSales.filter(s => !s.crew)
    const claimedInPage = claimSales.filter(s => !!s.crew)
    // Use overview (all-page aggregates) when available, fall back to page-only counts
    const unclaimedCount = claimOverview?.unclaimedCount ?? unclaimedInPage.length
    const claimedCount = claimOverview?.claimedCount ?? claimedInPage.length
    const unclaimedSettle = claimOverview?.unclaimedSettle ?? unclaimedInPage.reduce((sum, s) => sum + s.settle, 0)
    const claimedSettle = claimOverview?.claimedSettle ?? claimedInPage.reduce((sum, s) => sum + s.settle, 0)
    const todayActivity = claimOverview?.todayActivity ?? claimSales.filter(s => s.claimedAt && s.claimedAt.startsWith(todayStr)).length
    return {
      unclaimedCount,
      claimedCount,
      unclaimedSettle,
      claimedSettle,
      todayActivity,
    }
  }, [claimSales, todayStr, claimOverview])

  const selectedItemsTotal = useMemo(() => {
    return claimSales.filter(s => selectedSaleIds.has(s.id)).reduce((sum, s) => sum + s.settle, 0)
  }, [claimSales, selectedSaleIds])

  const selectedItemsPreview = useMemo(() => {
    return claimSales.filter(s => selectedSaleIds.has(s.id)).slice(0, 3)
  }, [claimSales, selectedSaleIds])

  const selectedClaimCrew = useMemo(() => {
    return crews.find(c => c.id === selectedClaimCrewId) || null
  }, [crews, selectedClaimCrewId])

  const activeQuickFilter = useMemo((): 'today' | 'week' | 'month' | 'all' | 'custom' => {
    const week = getWeekRange()
    const month = getMonthRange()
    if (claimDateFrom === todayStr && claimDateTo === todayStr) return 'today'
    if (claimDateFrom === week.from && claimDateTo === week.to) return 'week'
    if (claimDateFrom === month.from && claimDateTo === month.to) return 'month'
    if (!claimDateFrom && !claimDateTo) return 'all'
    return 'custom'
  }, [claimDateFrom, claimDateTo, todayStr])

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (claimSearch) count++
    if (claimFilterProgram) count++
    if (claimFilterCrew) count++
    if (activeQuickFilter === 'custom') count++
    if (claimShowClaimed !== 'unclaimed') count++
    return count
  }, [claimSearch, claimFilterProgram, claimFilterCrew, activeQuickFilter, claimShowClaimed])

  // ─── Management handlers ──────────────────────────────
  const handleSaveCrew = async (data: { name: string; photo: string; employeeId: string; groupId: string }) => {
    try {
      const url = editCrew ? '/api/crews' : '/api/crews'
      const method = editCrew ? 'PUT' : 'POST'
      const body = editCrew ? { id: editCrew.id, ...data } : data
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(editCrew ? 'Crew diperbarui' : 'Crew ditambahkan')
      setShowAddCrew(false); setEditCrew(null); fetchManagement()
    } catch { toast.error('Gagal menyimpan crew') }
  }

  const handleDeleteCrew = async (id: string) => {
    try {
      const r = await fetch(`/api/crews?id=${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Crew dihapus'); fetchManagement()
    } catch { toast.error('Gagal menghapus crew') }
  }

  const handleSaveGroup = async (data: { name: string; logo: string; monthlyTarget: number; week1Target: number; week2Target: number; week3Target: number; week4Target: number }) => {
    try {
      const method = editGroup ? 'PUT' : 'POST'
      const body = editGroup ? { id: editGroup.id, ...data } : data
      const r = await safeFetch('/api/groups', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(editGroup ? 'Group diperbarui' : 'Group ditambahkan')
      setShowAddGroup(false); setEditGroup(null); fetchManagement()
    } catch { toast.error('Gagal menyimpan group') }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      const r = await fetch(`/api/groups?id=${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Group dihapus'); fetchManagement()
    } catch { toast.error('Gagal menghapus group') }
  }

  // ─── Group Detail fetch ──────────────────────────────
  const fetchGroupDetail = useCallback(async (groupId: string, period: 'daily' | 'weekly' | 'monthly') => {
    setGroupDetailLoading(true)
    try {
      const r = await safeFetch(`/api/dashboard/group-detail?groupId=${groupId}&period=${period}`)
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      setGroupDetailData(d)
    } catch { toast.error('Gagal memuat detail grup') }
    finally { setGroupDetailLoading(false) }
  }, [])

  // Open group detail when selectedGroupDetail changes
  useEffect(() => {
    if (selectedGroupDetail) {
      fetchGroupDetail(selectedGroupDetail.id, groupDetailPeriod)
    }
  }, [selectedGroupDetail, groupDetailPeriod, fetchGroupDetail])

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (claimDateFrom) params.set('dateFrom', claimDateFrom)
      if (claimDateTo) params.set('dateTo', claimDateTo)
      const url = `/api/export${params.toString() ? '?' + params.toString() : ''}`
      const r = await fetch(url)
      if (!r.ok) { toast.error('Gagal mengekspor data'); return }
      const blob = await r.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `laporan-penjualan-${getWIBToday()}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('Data berhasil diekspor ke CSV')
    } catch { toast.error('Gagal mengekspor data') }
  }

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams()
      if (claimDateFrom) params.set('dateFrom', claimDateFrom)
      if (claimDateTo) params.set('dateTo', claimDateTo)
      if (claimFilterProgram) params.set('program', claimFilterProgram)
      if (claimFilterCrew) params.set('crewId', claimFilterCrew)
      if (claimShowClaimed !== 'all') params.set('claimed', claimShowClaimed === 'claimed' ? 'true' : 'false')
      if (claimSearch) params.set('search', claimSearch)
      const url = `/api/export/excel${params.toString() ? '?' + params.toString() : ''}`
      const r = await fetch(url)
      if (!r.ok) { const d = await r.json().catch(() => ({})); toast.error(d.error || 'Gagal mengekspor data'); return }
      const blob = await r.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `laporan-penjualan-${getWIBToday()}.xlsx`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('Data berhasil diekspor ke Excel (.xlsx)')
    } catch { toast.error('Gagal mengekspor data') }
  }

  // ─── Render Helpers ───────────────────────────────────
  const wibDate = getWIBDate()
  const dateStr = `${dayNames[wibDate.getDay()]}, ${wibDate.getDate()} ${monthNames[wibDate.getMonth()]} ${wibDate.getFullYear()}`

  // ─── RENDER ────────────────────────────────────────────
  const navItems = [
    { val: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Ringkasan & statistik' },
    { val: 'claims', icon: Upload, label: 'Claim Penjualan', desc: 'Upload & klaim data' },
    { val: 'management', icon: Settings, label: 'Management', desc: 'Kelola crew & grup' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-emerald-50/20 to-teal-50/10 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative">
      {/* Dot pattern overlay */}
      <div className="absolute inset-0 bg-dot-pattern pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 flex flex-col min-h-screen">

      {/* ═══ PREMIUM NAVBAR ═══ */}
      <header className="sticky top-0 z-50">
        <div className="relative">
          {/* Top bar */}
          <div className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-border/50">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-14 sm:h-16">
                {/* Logo */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Layers className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-subtle-pulse ring-2 ring-white dark:ring-gray-950" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 dark:from-emerald-400 dark:via-emerald-300 dark:to-teal-400 bg-clip-text text-transparent leading-tight">
                      CMS Crew
                    </h1>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium -mt-0.5 tracking-wide">
                      Ahtjong Labs <span className="inline-block mx-1 text-muted-foreground/30">·</span> {dateStr}
                    </p>
                  </div>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1">
                  {navItems.map(t => (
                    <button
                      key={t.val}
                      onClick={() => setActiveTab(t.val)}
                      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        activeTab === t.val
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                      {activeTab === t.val && (
                        <motion.div layoutId="nav-active" className="absolute inset-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 -z-10" transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }} />
                      )}
                    </button>
                  ))}
                </nav>

                {/* Right actions */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Live Clock */}
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 border border-border/50 text-xs font-mono tabular-nums text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="font-semibold text-foreground">{currentTime}</span>
                    <span className="text-[9px]">WIB</span>
                  </div>

                  {/* Notifications */}
                  <div className="relative" data-notif-dropdown>
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted relative" onClick={() => setShowNotif(!showNotif)}>
                      <Bell className="w-4 h-4" />
                      {dashboard?.recentSales && dashboard.recentSales.length > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                      )}
                    </Button>
                    <AnimatePresence>
                      {showNotif && (
                        <>
                          {/* Mobile backdrop */}
                          <div className="sm:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setShowNotif(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="z-50 overflow-hidden rounded-xl border bg-white dark:bg-gray-900 shadow-2xl sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-96 fixed inset-x-0 top-0 sm:inset-auto"
                        >
                          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-emerald-500" />
                              <span className="text-sm font-semibold">Aktivitas Terbaru</span>
                            </div>
                            <button onClick={() => setShowNotif(false)} className="text-muted-foreground hover:text-foreground">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="max-h-72 overflow-y-auto">
                            {dashboard?.recentSales && dashboard.recentSales.length > 0 ? (
                              dashboard.recentSales.slice(0, 5).map((sale, i) => (
                                <div key={sale.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0">
                                  <Avatar className="w-7 h-7 shrink-0">
                                    <AvatarImage src={sale.crew?.photo || ''} />
                                    <AvatarFallback className="text-[10px]">{(sale.crew?.name || '?')[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{sale.crew?.name || 'Unknown'}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{sale.kodeExtend} • {sale.tanggal}</p>
                                  </div>
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{fmtRp(sale.settle)}</span>
                                </div>
                              ))
                            ) : (
                              <div className="py-8 text-center">
                                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground">Belum ada aktivitas</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-amber-50 dark:hover:bg-gray-800 transition-colors" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} title={mounted ? (resolvedTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap') : undefined}>
                    {mounted ? (
                      <motion.div key={resolvedTheme} initial={{ rotate: -90, scale: 0.5, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.5, opacity: 0 }} transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 15 }}>
                        {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                      </motion.div>
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </Button>
                  {isAdmin && (
                    <>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 text-[10px] px-2 py-0.5 hidden sm:inline-flex">
                        <Shield className="w-3 h-3 mr-1" /> Admin
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Logout">
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Ribbon (desktop only) */}
          {dashboard && !dashLoading && (
            <div className="hidden sm:block border-b border-border/30 bg-gradient-to-r from-white/60 via-emerald-50/20 to-amber-50/10 dark:from-gray-950/60 dark:via-gray-900/40 dark:to-gray-950/60">
              <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-none">
                  {[
                    { icon: Users, label: 'Crew', value: String(dashboard.crewStats.length), color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40' },
                    { icon: Target, label: 'Groups', value: String(dashboard.groupAchievements.length), color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40' },
                    { icon: Crown, label: 'Best', value: dashboard.topCrews[0]?.name?.split(' ')[0] || '-', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/40' },
                    { icon: Calendar, label: dashPeriod === 'today' ? 'Today' : dashPeriod === 'week' ? 'Week' : 'Month', value: dashPeriod === 'today' ? fmtRp(dashboard.totals.today) : dashPeriod === 'week' ? fmtRp(dashboard.totals.week) : fmtRp(dashboard.totals.month), color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/60 dark:border-cyan-800/40' },
                  ].map((stat, i) => (
                    <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium whitespace-nowrap shrink-0 ${stat.color}`}>
                      <stat.icon className="w-3 h-3" />
                      <span className="text-muted-foreground">{stat.label}</span>
                      <span className="font-bold tabular-nums">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────── */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

            {/* ─── Dashboard Tab ────────────────────────── */}
            <TabsContent value="dashboard" className="mt-4 sm:mt-6 pb-24 md:pb-8" forceMount style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div key="dashboard" {...tabTransition}>
              {dashLoading ? (
                <div className="space-y-6 animate-pulse">
                  {/* Skeleton Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-4 sm:p-6 rounded-xl border bg-white dark:bg-gray-900 card-hover-glow">
                        <div className="h-3 skeleton-shimmer-premium w-3/4 mb-3" />
                        <div className="h-7 skeleton-shimmer-premium w-2/3 mb-2" />
                        <div className="h-2.5 skeleton-shimmer-premium w-1/2" />
                      </div>
                    ))}
                  </div>
                  {/* Skeleton Podium */}
                  <div className="p-6 rounded-xl border bg-white dark:bg-gray-900">
                    <div className="h-4 skeleton-shimmer-premium w-40 mb-6" />
                    <div className="flex items-end justify-center gap-3 sm:gap-6 pb-4">
                      {['h-28 sm:h-36', 'h-36 sm:h-48', 'h-24 sm:h-32'].map((h, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full skeleton-shimmer-premium mb-2" />
                          <div className="h-3 skeleton-shimmer-premium w-16 mb-2" />
                          <div className={`w-20 sm:w-28 ${h} rounded-t-xl skeleton-shimmer-premium`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Skeleton Table Rows */}
                  <div className="p-6 rounded-xl border bg-white dark:bg-gray-900 space-y-3">
                    <div className="h-4 skeleton-shimmer-premium w-48 mb-4" />
                    <table className="w-full">
                      <tbody>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <SkeletonRow key={i} cols={5} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : dashboard ? (
                <motion.div {...stagger} className="space-y-6">
                  {/* Welcome Back Section */}
                  {isAdmin && (
                    <motion.div {...fadeIn} transition={{ delay: 0 }}>
                      <Card className="border-0 shadow-lg overflow-hidden relative card-scale-hover">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 animate-gradient-bg dark:from-emerald-800 dark:via-teal-700 dark:to-emerald-900" />
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                        <CardContent className="p-4 sm:p-6 relative z-10">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                              <h2 className="text-lg sm:text-xl font-bold text-white">Selamat datang, Admin!</h2>
                              <p className="text-emerald-100 text-sm mt-1">{dateStr} — {currentTime} WIB</p>
                            </div>
                            <div className="flex gap-2 sm:gap-3 flex-wrap">
                              <div className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 min-w-0">
                                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-medium">Transaksi Hari Ini</p>
                                <p className="text-lg font-bold text-white tabular-nums truncate">{dashboard.crewStats.reduce((s, c) => s + c.todayStruk, 0)}</p>
                              </div>
                              <div className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 min-w-0">
                                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-medium">Total Bulan Ini</p>
                                <p className="text-lg font-bold text-white tabular-nums truncate">{fmtRp(dashboard.totals.month)}</p>
                              </div>
                              <div className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 min-w-0">
                                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-medium">Qty Bulan Ini</p>
                                <p className="text-lg font-bold text-white tabular-nums truncate">{fmtNum(dashboard.totals.monthQty)}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { label: 'Penjualan Hari Ini', value: dashboard.totals.today, qty: dashboard.totals.todayQty, icon: Zap, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', trend: dashboard.trends?.today },
                      { label: 'Penjualan Minggu Ini', value: dashboard.totals.week, qty: dashboard.totals.weekQty, icon: TrendingUp, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', trend: dashboard.trends?.week },
                      { label: 'Penjualan Bulan Ini', value: dashboard.totals.month, qty: dashboard.totals.monthQty, icon: BarChart3, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', trend: dashboard.trends?.month },
                      { label: 'Total Transaksi', value: dashboard.crewStats.reduce((s, c) => s + c.transactionCount, 0), qty: 0, icon: ShoppingCart, gradient: 'from-cyan-500 to-sky-600', shadow: 'shadow-cyan-500/20', trend: null },
                    ].map((card, i) => (
                      <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }} whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300 } }}>
                        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-default card-hover-glow card-scale-hover">
                          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-300`} />
                          {/* Animated gradient top bar */}
                          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />
                          <CardContent className="p-4 sm:p-6 relative">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                                  {card.trend && card.trend.changePercent != null && card.trend.direction !== 'same' && (
                                    <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                      card.trend.direction === 'up' ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/50' : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950/50'
                                    }`}>
                                      {card.trend.direction === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                      {Math.abs(card.trend.changePercent).toFixed(1)}%
                                    </motion.span>
                                  )}
                                </div>
                                <p className="text-lg sm:text-2xl font-bold tracking-tight">
                                  <AnimatedCounter value={card.value} prefix={i < 3 ? 'Rp' : ''} />
                                </p>
                                {card.qty > 0 && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Package className="w-3 h-3" />{fmtNum(card.qty)} items
                                  </p>
                                )}
                              </div>
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} ${card.shadow} shadow-lg flex items-center justify-center group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                                <card.icon className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {/* Today's Highlight Summary Cards */}
                  <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <Card className="border-0 shadow-md overflow-hidden relative group cursor-default card-scale-hover">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-sky-600 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity" />
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-sky-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-4 relative">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
                              <ShoppingCart className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Transaction Hari Ini</p>
                              <p className="text-xl font-bold tabular-nums">{dashboard.crewStats.reduce((s, c) => s + c.todayStruk, 0)} <span className="text-xs font-normal text-muted-foreground">struk</span></p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-md overflow-hidden relative group cursor-default card-scale-hover">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity" />
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-4 relative">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Average Basket Size</p>
                              <p className="text-xl font-bold tabular-nums">
                                {(() => {
                                  const totalStruk = dashboard.crewStats.reduce((s, c) => s + c.todayStruk, 0)
                                  const totalQty = dashboard.crewStats.reduce((s, c) => s + c.todayQty, 0)
                                  return totalStruk > 0 ? (totalQty / totalStruk).toFixed(1) : '0'
                                })()} <span className="text-xs font-normal text-muted-foreground">qty/struk</span>
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-md overflow-hidden relative group cursor-default card-scale-hover">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity" />
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-4 relative">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
                              <Flame className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Top Performer</p>
                              <p className="text-xl font-bold">{dashboard.topCrews[0]?.name?.split(' ')[0] || '-'}</p>
                              <p className="text-xs text-muted-foreground">{fmtRp(dashboard.topCrews[0]?.todayTotal || 0)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>

                  {/* Top Crew Leaderboard */}
                  <motion.div {...inViewFadeUp} transition={{ delay: 0.05 }}>
                    <Card className="border-0 shadow-lg overflow-hidden card-hover-glow card-scale-hover">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20">
                              <Trophy className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-base leading-tight">Top Crew Leaderboard</CardTitle>
                              <p className="text-[10px] text-muted-foreground">Peringkat kru berdasarkan total penjualan</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fetchDashboard()} title="Refresh">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            <div className="flex gap-1 bg-muted rounded-lg p-1">
                            {(['today', 'week', 'month'] as const).map(p => (
                              <button key={p} onClick={() => setDashPeriod(p)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${dashPeriod === p ? 'bg-white dark:bg-gray-800 shadow text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'}`}>
                                {p === 'today' ? 'Hari Ini' : p === 'week' ? 'Minggu' : 'Bulan'}
                              </button>
                            ))}
                          </div>
                        </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {dashboard.topCrews.length === 0 ? (
                          <div className="text-center py-12">
                            <motion.div
                              animate={{ y: [0, -8, 0] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                              className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-950/40 dark:to-amber-950/40 flex items-center justify-center"
                            >
                              <BarChart3 className="w-10 h-10 text-emerald-400 dark:text-emerald-600" />
                            </motion.div>
                            <h3 className="text-base font-bold text-foreground mb-1">Belum Ada Data Penjualan</h3>
                            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">Upload file Excel dan posting penjualan pertama untuk melihat statistik</p>
                            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30" onClick={() => setActiveTab('claims')}>
                              <Upload className="w-3.5 h-3.5 mr-1.5" />Upload Penjualan
                            </Button>
                          </div>
                        ) : (
                          <>
                          {/* Podium Section */}
                          <div className="relative mb-6">
                            {/* Background glow with emerald accent */}
                            <div className="absolute inset-0 bg-gradient-to-b from-amber-100/40 via-emerald-50/20 to-transparent dark:from-amber-900/10 dark:via-emerald-950/10 rounded-xl pointer-events-none" />

                            {/* Podium base / floor line */}
                            <div className="relative flex items-end justify-center gap-2 sm:gap-4 pt-2 pb-0">
                              {/* ─── 2nd Place ─── */}
                              {dashboard.topCrews[1] && (() => {
                                const crew = dashboard.topCrews[1]
                                const periodVal = dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
                                const periodQty = dashPeriod === 'today' ? crew.todayQty : dashPeriod === 'week' ? crew.weekQty : crew.monthQty
                                const periodStruk = dashPeriod === 'today' ? crew.todayStruk : dashPeriod === 'week' ? crew.weekStruk : crew.monthStruk
                                return (
                                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
                                    className="flex flex-col items-center flex-1 max-w-[150px]">
                                    {/* Avatar + rank badge */}
                                    <div className="relative mb-1.5">
                                      <Avatar className="w-11 h-11 sm:w-14 sm:h-14 border-2 border-gray-300 dark:border-gray-600 shadow-md">
                                        <AvatarImage src={crew.photo || ''} />
                                        <AvatarFallback className="bg-gradient-to-br from-gray-300 to-gray-500 dark:from-gray-600 dark:to-gray-800 text-white font-bold text-xs sm:text-sm">
                                          {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      {/* Rank number badge */}
                                      <span className="absolute -top-2.5 -right-2.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-500 dark:to-gray-700 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md border-2 border-white dark:border-gray-800">2</span>
                                    </div>
                                    <p className="text-[11px] sm:text-xs font-semibold text-center max-w-[110px] truncate leading-tight">{crew.name}</p>
                                    <p className="text-[10px] text-muted-foreground mb-1.5">{crew.groupName}</p>
                                    {/* Podium platform */}
                                    <div className="w-full max-w-[110px] h-28 sm:h-40 rounded-t-xl bg-gradient-to-t from-gray-300 via-gray-200 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500 flex flex-col items-center justify-between pt-2.5 pb-2 shadow-lg relative overflow-hidden">
                                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                                      {/* Juara label */}
                                      <span className="relative z-10 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-300 bg-gray-200/70 dark:bg-gray-700/60 px-2 py-0.5 rounded-full">Juara 2</span>
                                      <div className="relative z-10 flex flex-col items-center">
                                        <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200">{fmtRp(periodVal)}</span>
                                        <span className="text-[9px] text-gray-500 dark:text-gray-400">{fmtNum(periodStruk)} struk · {fmtNum(periodQty)} qty</span>
                                        {crew.crewMonthlyTarget > 0 && (
                                          <span className={`text-[8px] sm:text-[9px] font-semibold mt-0.5 ${getAchievementColor(crew.weeklyAchievement).text}`}>🎯 Target: {Math.round(crew.weeklyAchievement)}%</span>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                )
                              })()}

                              {/* ─── 1st Place (center, tallest) ─── */}
                              {dashboard.topCrews[0] && (() => {
                                const crew = dashboard.topCrews[0]
                                const periodVal = dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
                                const periodQty = dashPeriod === 'today' ? crew.todayQty : dashPeriod === 'week' ? crew.weekQty : crew.monthQty
                                const periodStruk = dashPeriod === 'today' ? crew.todayStruk : dashPeriod === 'week' ? crew.weekStruk : crew.monthStruk
                                return (
                                  <motion.div initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 150, damping: 12 }}
                                    className="flex flex-col items-center flex-1 max-w-[170px]">
                                    {/* Crown bounce */}
                                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="mb-0.5">
                                      <span className="text-2xl sm:text-3xl">👑</span>
                                    </motion.div>
                                    {/* Avatar with rank badge */}
                                    <div className="relative mb-1.5">
                                      <Avatar className="w-14 h-14 sm:w-18 sm:h-18 border-[3px] border-amber-400 shadow-lg shadow-amber-500/30 ring-2 ring-amber-200/50 dark:ring-amber-600/30 ring-offset-2 ring-offset-background">
                                        <AvatarImage src={crew.photo || ''} />
                                        <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm sm:text-base">
                                          {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      {/* Rank number badge – gold */}
                                      <span className="absolute -top-2.5 -right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 flex items-center justify-center text-amber-900 dark:text-amber-100 font-black text-sm sm:text-base shadow-lg shadow-amber-500/40 border-2 border-amber-200 dark:border-amber-700">1</span>
                                      {/* Sparkle effect */}
                                      <motion.span className="absolute -top-1 -left-1 text-xs" animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>✨</motion.span>
                                      <motion.span className="absolute -bottom-0.5 -right-1 text-[10px]" animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.7 }}>✨</motion.span>
                                    </div>
                                    <p className="text-xs sm:text-sm font-bold text-center max-w-[130px] truncate leading-tight text-amber-700 dark:text-amber-400">{crew.name}</p>
                                    <p className="text-[10px] text-muted-foreground mb-1.5">{crew.groupName}</p>
                                    {/* Podium platform – tallest */}
                                    <div className="w-full max-w-[130px] h-40 sm:h-56 rounded-t-xl bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-300 dark:from-amber-700 dark:via-amber-500 dark:to-yellow-600 flex flex-col items-center justify-between pt-3 pb-3 shadow-xl shadow-amber-500/20 relative overflow-hidden">
                                      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                                      {/* Emerald-accented Juara 1 label */}
                                      <span className="relative z-10 text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-200 bg-white/70 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full shadow-sm">Juara 1</span>
                                      <div className="relative z-10 flex flex-col items-center">
                                        <span className="text-xs sm:text-sm font-bold text-white drop-shadow">{fmtRp(periodVal)}</span>
                                        <span className="text-[9px] text-amber-100">{fmtNum(periodStruk)} struk · {fmtNum(periodQty)} qty</span>
                                        {crew.crewMonthlyTarget > 0 && (
                                          <span className={`text-[8px] sm:text-[9px] font-semibold mt-0.5 ${crew.weeklyAchievement >= 100 ? 'text-teal-200' : 'text-amber-200'}`}>🎯 Target: {Math.round(crew.weeklyAchievement)}%</span>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                )
                              })()}

                              {/* ─── 3rd Place ─── */}
                              {dashboard.topCrews[2] && (() => {
                                const crew = dashboard.topCrews[2]
                                const periodVal = dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
                                const periodQty = dashPeriod === 'today' ? crew.todayQty : dashPeriod === 'week' ? crew.weekQty : crew.monthQty
                                const periodStruk = dashPeriod === 'today' ? crew.todayStruk : dashPeriod === 'week' ? crew.weekStruk : crew.monthStruk
                                return (
                                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 180 }}
                                    className="flex flex-col items-center flex-1 max-w-[150px]">
                                    {/* Avatar + rank badge */}
                                    <div className="relative mb-1.5">
                                      <Avatar className="w-11 h-11 sm:w-14 sm:h-14 border-2 border-orange-300 dark:border-orange-700 shadow-md">
                                        <AvatarImage src={crew.photo || ''} />
                                        <AvatarFallback className="bg-gradient-to-br from-orange-300 to-orange-500 dark:from-orange-700 dark:to-orange-900 text-white font-bold text-xs sm:text-sm">
                                          {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      {/* Rank number badge */}
                                      <span className="absolute -top-2.5 -right-2.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 dark:from-orange-600 dark:to-orange-800 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-md border-2 border-white dark:border-orange-900">3</span>
                                    </div>
                                    <p className="text-[11px] sm:text-xs font-semibold text-center max-w-[110px] truncate leading-tight">{crew.name}</p>
                                    <p className="text-[10px] text-muted-foreground mb-1.5">{crew.groupName}</p>
                                    {/* Podium platform */}
                                    <div className="w-full max-w-[110px] h-20 sm:h-32 rounded-t-xl bg-gradient-to-t from-orange-400 via-orange-300 to-orange-100 dark:from-orange-800 dark:via-orange-600 dark:to-orange-400 flex flex-col items-center justify-between pt-2.5 pb-2 shadow-lg relative overflow-hidden">
                                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                                      {/* Juara label */}
                                      <span className="relative z-10 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-200 bg-orange-100/70 dark:bg-orange-900/50 px-2 py-0.5 rounded-full">Juara 3</span>
                                      <div className="relative z-10 flex flex-col items-center">
                                        <span className="text-[10px] sm:text-xs font-bold text-orange-800 dark:text-orange-100">{fmtRp(periodVal)}</span>
                                        <span className="text-[9px] text-orange-600 dark:text-orange-300">{fmtNum(periodStruk)} struk · {fmtNum(periodQty)} qty</span>
                                        {crew.crewMonthlyTarget > 0 && (
                                          <span className={`text-[8px] sm:text-[9px] font-semibold mt-0.5 ${getAchievementColor(crew.weeklyAchievement).text}`}>🎯 Target: {Math.round(crew.weeklyAchievement)}%</span>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                )
                              })()}
                            </div>

                            {/* Shared podium floor */}
                            <div className="mx-2 sm:mx-4 h-2 rounded-b-xl bg-gradient-to-r from-gray-300 via-amber-400 to-orange-300 dark:from-gray-700 dark:via-amber-600 dark:to-orange-600 opacity-60" />
                          </div>

                          {/* Performance highlight bar for top crew */}
                          {dashboard.topCrews[0] && (() => {
                            const topCrew = dashboard.topCrews[0]
                            const periodVal = dashPeriod === 'today' ? topCrew.todayTotal : dashPeriod === 'week' ? topCrew.weekTotal : topCrew.monthTotal
                            const totalAllCrews = dashboard.crewStats.reduce((s, c) => s + (dashPeriod === 'today' ? c.todayTotal : dashPeriod === 'week' ? c.weekTotal : c.monthTotal), 0)
                            const sharePct = totalAllCrews > 0 ? Math.round((periodVal / totalAllCrews) * 100) : 0
                            return (
                              <div className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="text-sm">🏆</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                                      <span className="font-bold">{topCrew.name}</span> memimpin dengan kontribusi <span className="font-bold">{sharePct}%</span> dari total penjualan
                                    </p>
                                    <div className="mt-1.5 h-2 bg-amber-200/50 dark:bg-amber-900/30 rounded-full overflow-hidden">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${sharePct}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full shadow-sm" />
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{fmtRp(periodVal)}</p>
                                    <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70">dari {fmtRp(totalAllCrews)}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                          </>
                        )}

                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Full Ranking — Separate Card for easy scrolling */}
                  {dashboard.crewStats.length > 0 && (
                    <motion.div {...inViewFadeUp} transition={{ delay: 0.08 }}>
                      <Card className="border-0 shadow-lg overflow-hidden card-hover-glow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                                <Medal className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-base leading-tight">Full Ranking Crew</CardTitle>
                                <p className="text-[10px] text-muted-foreground">Klik crew untuk lihat detail target & pencapaian</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{dashboard.crewStats.length} crew</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                          {/* Mobile Card View — natural scroll, no max-height */}
                          <div className="md:hidden space-y-2.5">
                            {dashboard.crewStats.map((crew, idx) => {
                              const periodVal = dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
                              const periodQty = dashPeriod === 'today' ? crew.todayQty : dashPeriod === 'week' ? crew.weekQty : crew.monthQty
                              const periodStruk = dashPeriod === 'today' ? crew.todayStruk : dashPeriod === 'week' ? crew.weekStruk : crew.monthStruk
                              const maxVal = dashboard.crewStats[0] ? (dashPeriod === 'today' ? dashboard.crewStats[0].todayTotal : dashPeriod === 'week' ? dashboard.crewStats[0].weekTotal : dashboard.crewStats[0].monthTotal) : 1
                              const pct = maxVal > 0 ? Math.round((periodVal / maxVal) * 100) : 0
                              const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                              const achColor = crew.crewMonthlyTarget > 0 ? getAchievementColor(crew.weeklyAchievement) : null
                              const monthlyAch = crew.crewMonthlyTarget > 0 ? Math.min(Math.round((crew.monthlyAchievement / crew.crewMonthlyTarget) * 100) || 0, 999) : 0
                              const weeklyAch = Math.round(crew.weeklyAchievement)
                              return (
                                <motion.div key={crew.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                                  className={`p-3 rounded-xl border transition-colors cursor-pointer active:scale-[0.98] ${idx < 3 ? 'bg-gradient-to-r from-amber-50/80 to-transparent dark:from-amber-950/20 border-amber-200/40 dark:border-amber-800/20' : 'bg-white dark:bg-gray-900 border-border/40 hover:border-border'}`}
                                  onClick={() => setSelectedCrewDetail(crew)}>
                                  {/* Top row: rank, avatar, name, amount */}
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${idx < 3 ? 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800' : 'bg-muted'}`}>
                                      {rankMedal ? <span>{rankMedal}</span> : <span className="text-muted-foreground">{idx + 1}</span>}
                                    </div>
                                    <Avatar className="w-9 h-9 shrink-0">
                                      <AvatarImage src={crew.photo || ''} />
                                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold">
                                        {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold truncate">{crew.name}</p>
                                      <p className="text-[10px] text-muted-foreground">{crew.groupName} · {fmtNum(periodStruk)} struk</p>
                                    </div>
                                    <div className="text-right shrink-0 pl-2">
                                      <p className={`text-sm font-bold tabular-nums ${idx < 3 ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>{fmtRp(periodVal)}</p>
                                      <p className="text-[10px] text-muted-foreground">{fmtNum(periodQty)} qty</p>
                                    </div>
                                  </div>
                                  {/* Bottom row: contribution bar + target indicator */}
                                  <div className="mt-2.5 flex items-center gap-3">
                                    {/* Contribution bar */}
                                    <div className="flex-1 min-w-0">
                                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: idx * 0.03 }}
                                          className={`h-full rounded-full ${idx === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : idx === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' : idx === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`} />
                                      </div>
                                    </div>
                                    {/* Target indicator */}
                                    {crew.crewMonthlyTarget > 0 && (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <div className="relative w-10 h-10">
                                          <CircularProgress value={Math.min(weeklyAch, 999)} size={40} strokeWidth={3} />
                                          <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold ${achColor?.text || 'text-muted-foreground'}`}>{weeklyAch}%</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                          {/* Desktop Table View — natural scroll, no max-height */}
                          <div className="hidden md:block">
                            <Table className="table-stripe table-sticky-head table-row-hover">
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="w-12 text-center">#</TableHead>
                                  <TableHead>Crew</TableHead>
                                  <TableHead>Group</TableHead>
                                  <TableHead className="text-center">Struk</TableHead>
                                  <TableHead className="text-center">Qty</TableHead>
                                  <TableHead className="w-[180px]">Kontribusi</TableHead>
                                  <TableHead className="w-[120px]">Target</TableHead>
                                  <TableHead className="text-right">Penjualan</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dashboard.crewStats.map((crew, idx) => {
                                  const periodVal = dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
                                  const periodQty = dashPeriod === 'today' ? crew.todayQty : dashPeriod === 'week' ? crew.weekQty : crew.monthQty
                                  const periodStruk = dashPeriod === 'today' ? crew.todayStruk : dashPeriod === 'week' ? crew.weekStruk : crew.monthStruk
                                  const maxVal = dashboard.crewStats[0] ? (dashPeriod === 'today' ? dashboard.crewStats[0].todayTotal : dashPeriod === 'week' ? dashboard.crewStats[0].weekTotal : dashboard.crewStats[0].monthTotal) : 1
                                  const pct = maxVal > 0 ? Math.round((periodVal / maxVal) * 100) : 0
                                  const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                                  const weeklyAch = Math.round(crew.weeklyAchievement)
                                  const monthlyAch = crew.crewMonthlyTarget > 0 ? Math.round((crew.monthlyAchievement / crew.crewMonthlyTarget) * 100) : 0
                                  const achColor = crew.crewMonthlyTarget > 0 ? getAchievementColor(crew.weeklyAchievement) : null
                                  return (
                                    <TableRow key={crew.id} className={`cursor-pointer transition-colors ${idx < 3 ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-100/40 dark:hover:bg-amber-950/20' : ''}`} onClick={() => setSelectedCrewDetail(crew)}>
                                      <TableCell className="text-center font-bold">
                                        {rankMedal ? <span className="text-base">{rankMedal}</span> : <span className="text-muted-foreground">{idx + 1}</span>}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2.5">
                                          <Avatar className={`w-8 h-8 ${idx === 0 ? 'ring-1 ring-amber-400' : ''}`}>
                                            <AvatarImage src={crew.photo || ''} />
                                            <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                                              {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <p className="font-medium text-sm leading-tight">{crew.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{crew.employeeId}</p>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-[10px] font-normal">{crew.groupName}</Badge>
                                      </TableCell>
                                      <TableCell className="text-center text-sm tabular-nums">{fmtNum(periodStruk)}</TableCell>
                                      <TableCell className="text-center text-sm tabular-nums">{fmtNum(periodQty)}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: idx * 0.03 }}
                                              className={`h-full rounded-full ${idx === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : idx === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' : idx === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} />
                                          </div>
                                          <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {crew.crewMonthlyTarget > 0 ? (
                                          <div className="flex items-center gap-2">
                                            <CircularProgress value={Math.min(weeklyAch, 999)} size={36} strokeWidth={3.5} />
                                            <div className="flex flex-col">
                                              <span className={`text-[9px] font-bold leading-tight ${achColor?.text || 'text-muted-foreground'}`}>M: {monthlyAch}%</span>
                                              <span className={`text-[8px] leading-tight ${achColor?.text || 'text-muted-foreground'}`}>W: {weeklyAch}%</span>
                                            </div>
                                          </div>
                                        ) : <span className="text-[10px] text-muted-foreground">—</span>}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className={`font-semibold tabular-nums ${idx < 3 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{fmtRp(periodVal)}</span>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Department Distribution — Dashboard Widget */}
                  <motion.div {...inViewFadeUp} transition={{ delay: 0.1 }}>
                    <Card className="border-0 shadow-lg overflow-hidden card-hover-glow card-scale-hover">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                              <Layers className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-base leading-tight">Distribusi Departemen</CardTitle>
                              <p className="text-[10px] text-muted-foreground">Bulan ini — {dashboard.dateInfo?.currentMonth ? monthNames[(dashboard.dateInfo.currentMonth || 1) - 1] : ''}</p>
                            </div>
                          </div>
                          {dashboard.deptBreakdown && dashboard.deptBreakdown.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">{dashboard.deptBreakdown.length} dept</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {dashboard.deptBreakdown && dashboard.deptBreakdown.length > 0 ? (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Donut Chart */}
                            <div className="flex items-center justify-center">
                              <div className="relative w-full max-w-[220px]">
                                <ResponsiveContainer width="100%" height={220}>
                                  <PieChart>
                                    <Pie
                                      data={dashboard.deptBreakdown}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={55}
                                      outerRadius={90}
                                      paddingAngle={2}
                                      dataKey="totalSettle"
                                      nameKey="dept"
                                      stroke="none"
                                    >
                                      {dashboard.deptBreakdown.map((entry, index) => {
                                        const deptIdx = deptColorMap.findIndex(c => c === getDeptColor(entry.dept))
                                        const colors = ['#10b981', '#f59e0b', '#a855f7', '#06b6d4', '#f43f5e', '#6366f1', '#14b8a6', '#f97316']
                                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                      })}
                                    </Pie>
                                    <Tooltip
                                      formatter={(value: number, name: string) => [fmtRp(value), name]}
                                      contentStyle={{ borderRadius: '12px', border: '1px solid oklch(0.9 0 0)', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                                {/* Center label */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                  <p className="text-[10px] text-muted-foreground font-medium">Total</p>
                                  <p className="text-sm font-extrabold text-foreground tabular-nums">{fmtRp(dashboard.deptBreakdown.reduce((s, x) => s + x.totalSettle, 0))}</p>
                                </div>
                              </div>
                            </div>
                            {/* Legend Bars */}
                            <div className="space-y-2.5">
                              {dashboard.deptBreakdown.slice(0, 6).map((d, idx) => {
                                const maxSettle = dashboard.deptBreakdown[0]?.totalSettle || 1
                                const pct = Math.round((d.totalSettle / maxSettle) * 100)
                                const grandTotal = dashboard.deptBreakdown.reduce((s, x) => s + x.totalSettle, 0)
                                const share = grandTotal > 0 ? ((d.totalSettle / grandTotal) * 100).toFixed(1) : '0'
                                const color = getDeptColor(d.dept)
                                const colors = ['#10b981', '#f59e0b', '#a855f7', '#06b6d4', '#f43f5e', '#6366f1', '#14b8a6', '#f97316']
                                return (
                                  <div key={d.dept} className="group/dept">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background ring-transparent group-hover/dept:ring-current/20 transition-all`} style={{ backgroundColor: colors[idx % colors.length] }} />
                                        <span className="text-xs font-medium text-foreground truncate">{d.dept}</span>
                                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{d.count} trx</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-bold text-foreground tabular-nums">{fmtRp(d.totalSettle)}</span>
                                        <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{share}%</span>
                                      </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.08 }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: colors[idx % colors.length] }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <motion.div
                              animate={{ y: [0, -6, 0] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                              className="inline-block"
                            >
                              <Layers className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
                            </motion.div>
                            <p className="text-sm text-muted-foreground">Belum ada data departemen</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Group Achievement Cards */}
                  <motion.div {...inViewFadeUp} transition={{ delay: 0.1 }}>
                    <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-emerald-500" />
                          <CardTitle className="text-base">Achievement Zoning / Group</CardTitle>
                        </div>
                        <CardDescription>
                          Minggu {dashboard.dateInfo.currentWeek} ({dashboard.dateInfo.weekStart}–{dashboard.dateInfo.weekEnd} {monthNames[dashboard.dateInfo.currentMonth]} {dashboard.dateInfo.currentYear})
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {dashboard.groupAchievements.length === 0 ? (
                          <div className="text-center py-10">
                            <motion.div
                              animate={{ y: [0, -6, 0] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                              className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40 flex items-center justify-center"
                            >
                              <Target className="w-8 h-8 text-emerald-400 dark:text-emerald-600" />
                            </motion.div>
                            <h3 className="text-sm font-bold text-foreground mb-1">Belum Ada Group</h3>
                            <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">Buat group/zoning terlebih dahulu di menu Management untuk tracking achievement</p>
                          </div>
                        ) : (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dashboard.groupAchievements.map((g) => (
                              <motion.div key={g.id} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }} whileTap={{ scale: 0.98 }}>
                                <Card
                                  className="border-0 shadow-md bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-800/80 overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-400/50 dark:hover:ring-emerald-600/40 transition-all duration-200"
                                  onClick={() => { setSelectedGroupDetail(g); setGroupDetailPeriod('daily') }}
                                >
                                  <CardContent className="p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                      <Avatar className="w-12 h-12 border-2 border-emerald-200 dark:border-emerald-800">
                                        <AvatarImage src={g.logo || ''} />
                                        <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold text-sm">
                                          {g.name.split(' ').slice(-1)[0][0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-bold text-sm">{g.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <Badge variant="outline" className="text-[10px]"><Users className="w-3 h-3 mr-1" />{g.crewCount} crew</Badge>
                                          <AchievementBadge pct={g.monthlyAchievement} />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Monthly Achievement */}
                                    <div className="flex items-center gap-4 mb-4">
                                      <CircularProgress value={g.monthlyAchievement} size={72} strokeWidth={6} />
                                      <div className="flex-1 space-y-2">
                                        <div>
                                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Bulanan</p>
                                          <p className="text-sm font-bold">{fmtRp(g.monthlyTotal)}</p>
                                          <p className="text-xs text-muted-foreground">Target: {fmtRp(g.monthlyTarget)}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Weekly Achievement */}
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                          Minggu {g.currentWeek} ({g.weekTargetPct}%)
                                        </p>
                                        <p className="text-xs font-semibold">{Math.round(g.weeklyAchievement)}%</p>
                                      </div>
                                      <Progress value={Math.min(g.weeklyAchievement, 100)} className="h-2" />
                                      <p className="text-xs text-muted-foreground">
                                        {fmtRp(g.weeklyTotal)} / {fmtRp(g.weeklyTarget)}
                                      </p>
                                    </div>

                                    {/* Click hint */}
                                    <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                                      <Eye className="w-3 h-3" />
                                      <span>Lihat Detail Crew</span>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Sales Chart */}
                  <motion.div {...inViewFadeUp} transition={{ delay: 0.1 }}>
                    <Card className="border-0 shadow-lg overflow-hidden card-hover-glow card-scale-hover">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-emerald-500" />
                          <CardTitle className="text-base">Penjualan per Crew</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {dashboard.crewStats.length > 0 ? (
                          <div className="h-56 sm:h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={dashboard.crewStats.map(c => ({
                                name: c.name.split(' ')[0],
                                value: dashPeriod === 'today' ? c.todayTotal : dashPeriod === 'week' ? c.weekTotal : c.monthTotal,
                                qty: dashPeriod === 'today' ? c.todayQty : dashPeriod === 'week' ? c.weekQty : c.monthQty,
                              }))} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                                <defs>
                                  <linearGradient id="barGradient0" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#059669" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
                                  </linearGradient>
                                  <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#d97706" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#b45309" stopOpacity={0.8} />
                                  </linearGradient>
                                  <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
                                  </linearGradient>
                                  <linearGradient id="barGradient3" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0891b2" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#0e7490" stopOpacity={0.8} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-20" stroke="oklch(0.85 0 0)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                  {dashboard.crewStats.map((_, idx) => (
                                    <Cell key={idx} fill={`url(#barGradient${Math.min(idx, 3)})`} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <motion.div
                              animate={{ y: [0, -6, 0] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                              className="inline-block"
                            >
                              <BarChart3 className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
                            </motion.div>
                            <p className="text-sm text-muted-foreground">Belum ada data penjualan per crew</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Sales Trend Line Chart */}
                  <motion.div {...inViewFadeUp} transition={{ delay: 0.15 }}>
                    <Card className="border-0 shadow-lg overflow-hidden card-hover-glow card-scale-hover">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-500" />
                          <CardTitle className="text-base">Tren Penjualan per Crew</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {dashboard.crewStats.length > 0 ? (
                          <div className="h-48 sm:h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={dashboard.topCrews.slice(0, 6).map(c => ({
                                name: c.name.split(' ')[0],
                                today: c.todayTotal,
                                week: c.weekTotal,
                                month: c.monthTotal,
                              }))} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-20" stroke="oklch(0.85 0 0)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} />
                                <Tooltip content={<ChartTooltip />} />
                                <Line type="monotone" dataKey="today" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }} activeDot={{ r: 6 }} name="Hari Ini" />
                                <Line type="monotone" dataKey="week" stroke="#d97706" strokeWidth={2} dot={{ r: 3, fill: '#d97706' }} name="Minggu Ini" strokeDasharray="5 5" />
                                <Line type="monotone" dataKey="month" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} name="Bulan Ini" strokeDasharray="2 4" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <motion.div
                              animate={{ y: [0, -6, 0] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                              className="inline-block"
                            >
                              <TrendingUp className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
                            </motion.div>
                            <p className="text-sm text-muted-foreground">Belum ada data tren</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>


                </motion.div>
              ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
            {/* ─── Claims Tab ───────────────────────────── */}
            <TabsContent value="claims" className="mt-4 sm:mt-6 pb-24 md:pb-8" forceMount style={{ display: activeTab === 'claims' ? 'block' : 'none' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'claims' && (
                  <motion.div key="claims" {...tabTransition}>
              <motion.div {...stagger} className="space-y-6">
                {/* Upload Modal Dialog */}
                <Dialog open={showUploadModal} onOpenChange={open => { setShowUploadModal(open); if (!open) { setUploadResult(null); setPreviewFile(null); setIsDragOver(false) } }}>
                  <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                          <FileSpreadsheet className="w-4 h-4 text-white" />
                        </div>
                        Upload Laporan Penjualan
                      </DialogTitle>
                      <DialogDescription>Upload file Excel (.xlsx/.xls) — data akan otomatis diimpor sebagai unclaimed</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Drag & Drop Zone */}
                      <div
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                          isDragOver
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg shadow-emerald-500/20 animate-shimmer-border-intense drop-zone-drag-active'
                            : 'border-muted-foreground/25 hover:border-emerald-400 hover:bg-muted/30 animate-shimmer-border drop-zone-pulse'
                        }`}
                        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={e => {
                          e.preventDefault(); setIsDragOver(false)
                          const file = e.dataTransfer.files?.[0]
                          if (file) handleDropFile(file)
                        }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                        <motion.div animate={isDragOver ? { y: -4 } : { y: 0 }}>
                          <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                            isDragOver ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-muted'
                          }`}>
                            <UploadCloud className={`w-7 h-7 ${isDragOver ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                          </div>
                          <p className="text-sm font-medium">Drag & drop file Excel di sini</p>
                          <p className="text-xs text-muted-foreground mt-1">atau klik untuk memilih file (.xlsx, .xls)</p>
                        </motion.div>
                      </div>

                      {uploading && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Mengimport data Excel...</p>
                              <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                                {uploadProgress < 30 ? 'Membaca file...' : uploadProgress < 70 ? 'Memproses data...' : uploadProgress < 100 ? 'Menyimpan ke database...' : 'Selesai!'}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{Math.round(uploadProgress)}%</span>
                          </div>
                          <div className="w-full h-2 bg-emerald-100 dark:bg-emerald-900 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full progress-stripe"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(uploadProgress, 100)}%` }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                          </div>
                        </motion.div>
                      )}

                      {uploadResult && !uploading && (
                        <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`p-4 rounded-xl ${uploadResult.totalRows === 0 && uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${uploadResult.totalRows === 0 && uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? 'bg-amber-100 dark:bg-amber-900' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                              {uploadResult.totalRows === 0 && uploadResult.duplicateRows && uploadResult.duplicateRows > 0
                                ? <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                : <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              }
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${uploadResult.totalRows === 0 && uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                {uploadResult.totalRows === 0 && uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? 'Semua Data Duplikat' : 'Import Berhasil!'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                {uploadResult.duplicateRows && uploadResult.duplicateRows > 0
                  ? `${uploadResult.totalRows} data baru diimpor, ${uploadResult.duplicateRows} duplikat dilewati`
                  : `${uploadResult.totalRows} row data berhasil diimpor`
                }
              </p>
                            </div>
                          </div>
                          <div className={`grid gap-2 ${uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
                            {[
                              { label: 'Data Baru', value: fmtNum(uploadResult.totalRows), icon: FileSpreadsheet, color: '' },
                              { label: 'Total Qty', value: fmtNum(uploadResult.totalQty), icon: Package, color: '' },
                              { label: 'Total Settle', value: fmtRp(uploadResult.totalSettle), icon: DollarSign, color: '' },
                              { label: 'Produk Unik', value: fmtNum(uploadResult.uniqueProducts), icon: Star, color: '' },
                              ...(uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? [{ label: 'Duplikat Dilewati', value: fmtNum(uploadResult.duplicateRows), icon: AlertTriangle, color: 'ring-2 ring-amber-300 dark:ring-amber-700' }] : []),
                            ].map((stat, i) => (
                              <div key={i} className={`bg-white/60 dark:bg-gray-900/60 rounded-lg p-2.5 text-center ${stat.color || ''}`}>
                                <stat.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${stat.color ? 'text-amber-500' : 'text-emerald-500'}`} />
                                <p className={`text-xs font-bold ${stat.color ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{stat.value}</p>
                                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                      {/* ── File Preview Section ── */}
                      {previewFile && previewFile.rows.length > 0 && !uploading && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-emerald-500" />
                              <span className="text-xs font-semibold text-foreground">Preview Data</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">{previewFile.name}</span>
                              <span className="text-[10px] text-muted-foreground">({(previewFile.size / 1024).toFixed(1)} KB)</span>
                              <Badge variant="outline" className="text-[10px]">{previewFile.rows.length} row</Badge>
                            </div>
                          </div>
                          <div className="rounded-lg border overflow-hidden">
                            <div className="max-h-48 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
                                  <tr>
                                    <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground">Tanggal</th>
                                    <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground">Dept</th>
                                    <th className="text-left px-2.5 py-1.5 font-semibold text-muted-foreground">Kode</th>
                                    <th className="text-right px-2.5 py-1.5 font-semibold text-muted-foreground">Qty</th>
                                    <th className="text-right px-2.5 py-1.5 font-semibold text-muted-foreground">Settle</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {previewFile.rows.slice(0, 10).map((row, i) => (
                                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                                      <td className="px-2.5 py-1.5 whitespace-nowrap text-muted-foreground">{row.tanggal}</td>
                                      <td className="px-2.5 py-1.5">
                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${getDeptColor(row.dept)} text-white`}>{row.dept || '-'}</span>
                                      </td>
                                      <td className="px-2.5 py-1.5 font-mono">{row.kodeExtend}</td>
                                      <td className="px-2.5 py-1.5 text-right tabular-nums">{row.qty}</td>
                                      <td className="px-2.5 py-1.5 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{fmtRp(row.settle)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {previewFile.rows.length > 10 && (
                              <div className="px-3 py-1.5 bg-muted/50 text-center">
                                <span className="text-[10px] text-muted-foreground">+{previewFile.rows.length - 10} row lainnya...</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                            <span>Total preview: {fmtRp(previewFile.rows.reduce((s, r) => s + r.settle, 0))}</span>
                            <span>{previewFile.rows.reduce((s, r) => s + r.qty, 0)} items</span>
                          </div>
                        </motion.div>
                      )}
                      {previewFile && previewFile.rows.length === 0 && !uploading && (
                        <div className="text-center py-3 text-xs text-muted-foreground">
                          <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                          Tidak dapat membaca preview data dari file
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowUploadModal(false)}>Tutup</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* ── Quick Stats Summary Bar ── */}
                {claimTotal > 0 && !claimsLoading && (
                  <motion.div {...fadeIn} transition={{ delay: 0.03 }}>
                    <div className="sticky top-14 sm:top-16 z-30 -mx-3 sm:-mx-0 px-3 sm:px-0 py-2 bg-gradient-to-r from-gray-50/95 via-white/95 to-gray-50/95 dark:from-gray-950/95 dark:via-gray-900/95 dark:to-gray-950/95 backdrop-blur-xl border-b border-border/30 print-hide">
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                        {/* Unclaimed count */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 shrink-0">
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            <AnimatedCounter value={claimStats.unclaimedCount} /> belum claim
                          </span>
                        </div>
                        {/* Unclaimed value */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                          <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            {fmtRp(claimStats.unclaimedSettle)}
                          </span>
                        </div>
                        {/* Total data */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 shrink-0">
                          <ShoppingCart className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {fmtNum(claimTotal)} total
                          </span>
                        </div>
                        {/* Today's claim activity */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 shrink-0">
                          <Flame className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                            {claimStats.todayActivity} claim hari ini
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Claim Stats Hero Section ── */}
                {claimTotal > 0 && !claimsLoading && (
                  <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        {
                          label: 'Belum Di-Claim',
                          count: claimStats.unclaimedCount,
                          value: fmtRp(claimStats.unclaimedSettle),
                          icon: Clock,
                          gradient: 'from-amber-400 to-orange-500',
                          bgLight: 'bg-amber-50 dark:bg-amber-950/20',
                          borderLight: 'border-amber-200/60 dark:border-amber-800/40',
                          textColor: 'text-amber-700 dark:text-amber-400',
                          iconBg: 'bg-amber-100 dark:bg-amber-900/60',
                        },
                        {
                          label: 'Sudah Di-Claim',
                          count: claimStats.claimedCount,
                          value: fmtRp(claimStats.claimedSettle),
                          icon: CheckCircle2,
                          gradient: 'from-emerald-400 to-emerald-600',
                          bgLight: 'bg-emerald-50 dark:bg-emerald-950/20',
                          borderLight: 'border-emerald-200/60 dark:border-emerald-800/40',
                          textColor: 'text-emerald-700 dark:text-emerald-400',
                          iconBg: 'bg-emerald-100 dark:bg-emerald-900/60',
                        },
                        {
                          label: 'Aktivitas Hari Ini',
                          count: claimStats.todayActivity,
                          value: `${claimStats.todayActivity} claim`,
                          icon: Flame,
                          gradient: 'from-rose-400 to-pink-600',
                          bgLight: 'bg-rose-50 dark:bg-rose-950/20',
                          borderLight: 'border-rose-200/60 dark:border-rose-800/40',
                          textColor: 'text-rose-700 dark:text-rose-400',
                          iconBg: 'bg-rose-100 dark:bg-rose-900/60',
                        },
                      ].map((stat, i) => (
                        <motion.div key={i} whileHover={{ y: -2, transition: { type: 'spring', stiffness: 300 } }}>
                          <div className={`relative overflow-hidden rounded-xl border ${stat.borderLight} ${stat.bgLight} p-4`}>
                            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.gradient} opacity-[0.07] rounded-full -translate-y-6 translate-x-6`} />
                            <div className="relative flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg shrink-0`}>
                                <stat.icon className="w-5 h-5 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                                <p className={`text-lg sm:text-xl font-bold ${stat.textColor} tracking-tight`}>
                                  <AnimatedCounter value={stat.count} />
                                </p>
                                <p className={`text-[10px] sm:text-xs ${stat.textColor} font-medium opacity-70`}>{stat.value}</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── Claim vs Unclaimed Progress Bar ── */}
                {claimTotal > 0 && !claimsLoading && (claimStats.claimedCount + claimStats.unclaimedCount > 0) && (
                  <motion.div {...fadeIn} transition={{ delay: 0.07 }}>
                    <div className="rounded-xl border border-border/40 bg-white dark:bg-gray-900 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Claim Progress</span>
                        <span className="text-xs text-muted-foreground">
                          {claimStats.claimedCount + claimStats.unclaimedCount} total
                        </span>
                      </div>
                      <div className="w-full h-5 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center"
                          initial={{ width: 0 }}
                          animate={{ width: `${(claimStats.claimedCount / (claimStats.claimedCount + claimStats.unclaimedCount)) * 100}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: 0.2 }}
                          style={{ minWidth: claimStats.claimedCount > 0 ? '2rem' : '0' }}
                        >
                          {(claimStats.claimedCount / (claimStats.claimedCount + claimStats.unclaimedCount)) * 100 > 10 && (
                            <span className="text-[10px] font-bold text-white drop-shadow-sm">
                              {Math.round((claimStats.claimedCount / (claimStats.claimedCount + claimStats.unclaimedCount)) * 100)}%
                            </span>
                          )}
                        </motion.div>
                        <motion.div
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center"
                          initial={{ width: 0 }}
                          animate={{ width: `${(claimStats.unclaimedCount / (claimStats.claimedCount + claimStats.unclaimedCount)) * 100}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: 0.4 }}
                          style={{ minWidth: claimStats.unclaimedCount > 0 ? '2rem' : '0' }}
                        >
                          {(claimStats.unclaimedCount / (claimStats.claimedCount + claimStats.unclaimedCount)) * 100 > 10 && (
                            <span className="text-[10px] font-bold text-white drop-shadow-sm">
                              {Math.round((claimStats.unclaimedCount / (claimStats.claimedCount + claimStats.unclaimedCount)) * 100)}%
                            </span>
                          )}
                        </motion.div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />
                          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            Sudah Claim: {fmtNum(claimStats.claimedCount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            Belum Claim: {fmtNum(claimStats.unclaimedCount)}
                          </span>
                          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Section 2: Summary Cards — Total Settle, Qty, Basket Size, Price Point */}
                {claimSummary && claimTotal > 0 && !claimsLoading && (
                  <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Settle', value: fmtRp(claimSummary.totalSettle ?? 0), icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', sub: `${fmtNum(claimTotal)} data` },
                        { label: 'Total Qty', value: fmtNum(claimSummary.totalQty ?? 0), icon: Package, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', sub: 'jumlah item' },
                        { label: 'Basket Size', value: (claimSummary.basketSize ?? 0).toFixed(2), icon: ShoppingCart, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', sub: `${fmtNum(claimSummary.totalStruk ?? 0)} struk` },
                        { label: 'Price Point', value: fmtRp(claimSummary.pricePoint ?? 0), icon: Percent, gradient: 'from-cyan-500 to-sky-600', shadow: 'shadow-cyan-500/20', sub: 'per item' },
                      ].map((s, i) => (
                        <motion.div key={i} whileHover={{ y: -2, transition: { type: 'spring', stiffness: 300 } }}>
                          <Card className="border-0 shadow-md card-hover-glow overflow-hidden">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">{s.label}</p>
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.gradient} ${s.shadow} shadow flex items-center justify-center`}>
                                  <s.icon className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                              <p className="text-sm sm:text-lg font-bold tracking-tight truncate">{s.value}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Section 3: Removed — Claim Action Bar is now a floating bottom bar */}

                {/* Section 4: Laporan Penjualan Table */}
                <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
                  <Card className="border-0 shadow-lg card-hover-glow overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 min-w-0">
                        {/* Header row */}
                        <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <ShoppingCart className="w-5 h-5 text-emerald-500 shrink-0" />
                            <CardTitle className="text-base truncate">Laporan Penjualan</CardTitle>
                            <Badge variant="outline" className="text-xs shrink-0">{fmtNum(claimTotal)} data</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1 sm:pb-0">
                            <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 shrink-0" onClick={() => setShowUploadModal(true)}>
                              <UploadCloud className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Upload</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30 shrink-0" onClick={() => window.print()}>
                              <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Print</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30 shrink-0" onClick={handleExport}>
                              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">CSV</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30 shrink-0" onClick={handleExportExcel}>
                              <FileSpreadsheet className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Excel</span>
                            </Button>
                            {isAdmin && batchSelectedIds.size > 0 && (
                              <Button variant="destructive" size="sm" className="h-8 gap-1.5 shrink-0" onClick={() => setDeleteConfirm({ type: 'batch-sale', ids: Array.from(batchSelectedIds), name: `${batchSelectedIds.size} data terpilih` })}>
                                <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Hapus</span> <span className="sm:hidden">({batchSelectedIds.size})</span>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Claim status toggle */}
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 w-fit">
                          {([
                            { val: 'unclaimed' as const, label: 'Belum Claim' },
                            { val: 'claimed' as const, label: 'Sudah Claim' },
                            { val: 'all' as const, label: 'Semua' },
                          ]).map(tab => (
                            <button
                              key={tab.val}
                              onClick={() => { setClaimShowClaimed(tab.val); setSelectedSaleIds(new Set()) }}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                claimShowClaimed === tab.val
                                  ? 'bg-white dark:bg-gray-900 shadow-sm text-foreground'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Quick Filter Chips */}
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
                          {[
                            { val: 'today' as const, label: 'Hari Ini', icon: CalendarDays },
                            { val: 'week' as const, label: 'Minggu Ini', icon: CalendarRange },
                            { val: 'month' as const, label: 'Bulan Ini', icon: Calendar },
                            { val: 'all' as const, label: 'Semua Tanggal', icon: Clock },
                          ].map(chip => (
                            <button
                              key={chip.val}
                              onClick={() => {
                                if (chip.val === 'today') { setClaimDateFrom(todayStr); setClaimDateTo(todayStr) }
                                else if (chip.val === 'week') { const r = getWeekRange(); setClaimDateFrom(r.from); setClaimDateTo(r.to) }
                                else if (chip.val === 'month') { const r = getMonthRange(); setClaimDateFrom(r.from); setClaimDateTo(r.to) }
                                else { setClaimDateFrom(''); setClaimDateTo('') }
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all border ${
                                activeQuickFilter === chip.val
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700 shadow-sm'
                                  : 'bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/70 hover:text-foreground'
                              }`}
                            >
                              <chip.icon className="w-3 h-3" />
                              {chip.label}
                            </button>
                          ))}
                        </div>

                        {/* ─── MOBILE: Premium filter panel ─── */}
                        <div className="sm:hidden space-y-2.5">
                          {/* Search — always visible */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Cari kode, brand, dept, crew..."
                              value={claimSearchInput}
                              onChange={e => setClaimSearchInput(e.target.value)}
                              className="pl-9 h-10 w-full rounded-xl bg-white dark:bg-gray-900 border-border/60 text-sm"
                            />
                            {claimSearchInput && (
                              <button onClick={() => { setClaimSearchInput(''); setClaimSearch('') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Filter toggle button */}
                          <button
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-gray-900 dark:to-gray-800/80 border border-border/60 transition-all active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <span className="text-xs font-semibold text-foreground">Filter Lanjutan</span>
                              {activeFilterCount > 0 && (
                                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                                  {activeFilterCount}
                                </span>
                              )}
                            </div>
                            <motion.div animate={{ rotate: showFilterPanel ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </motion.div>
                          </button>

                          {/* Expandable advanced filter panel */}
                          <AnimatePresence>
                            {showFilterPanel && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="pt-1 space-y-3 filter-panel-backdrop">
                                  {/* Program & Crew side by side */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <Select value={claimFilterProgram || '__all__'} onValueChange={v => setClaimFilterProgram(v === '__all__' ? '' : v)}>
                                      <SelectTrigger className="h-10 w-full text-xs rounded-xl bg-white dark:bg-gray-900 border-border/60">
                                        <Sparkles className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="Program" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__all__">Semua</SelectItem>
                                        {programs.map(p => (
                                          <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Select value={claimFilterCrew || '__all__'} onValueChange={v => setClaimFilterCrew(v === '__all__' ? '' : v)}>
                                      <SelectTrigger className="h-10 w-full text-xs rounded-xl bg-white dark:bg-gray-900 border-border/60">
                                        <Users className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="Crew" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__all__">Semua</SelectItem>
                                        {crews.map(c => (
                                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Date range with clear visual cards */}
                                  <div className="rounded-xl border border-border/60 bg-white/50 dark:bg-gray-900/50 p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-xs font-semibold text-foreground">Rentang Tanggal</span>
                                      </div>
                                      {(claimDateFrom || claimDateTo) && (
                                        <button
                                          onClick={() => { setClaimDateFrom(''); setClaimDateTo('') }}
                                          className="text-[10px] text-rose-500 dark:text-rose-400 font-medium flex items-center gap-0.5 active:opacity-70"
                                        >
                                          <X className="w-2.5 h-2.5" /> Reset
                                        </button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <span className="text-[10px] text-muted-foreground mb-1 block px-0.5">Dari</span>
                                        <Input
                                          type="date"
                                          value={claimDateFrom}
                                          onChange={e => setClaimDateFrom(e.target.value)}
                                          className="h-10 w-full text-xs rounded-lg bg-gray-50 dark:bg-gray-800 border-border/60"
                                        />
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-muted-foreground mb-1 block px-0.5">Sampai</span>
                                        <Input
                                          type="date"
                                          value={claimDateTo}
                                          onChange={e => setClaimDateTo(e.target.value)}
                                          className="h-10 w-full text-xs rounded-lg bg-gray-50 dark:bg-gray-800 border-border/60"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Reset all button */}
                                  {activeFilterCount > 0 && (
                                    <button
                                      onClick={() => {
                                        setClaimSearchInput('')
                                        setClaimSearch('')
                                        setClaimFilterProgram('')
                                        setClaimFilterCrew('')
                                        setClaimDateFrom('')
                                        setClaimDateTo('')
                                        setClaimShowClaimed('unclaimed')
                                      }}
                                      className="w-full py-2 text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5 active:text-foreground"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      Reset Semua Filter
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* ─── DESKTOP (sm+): Horizontal inline filters ─── */}
                        <div className="hidden sm:block">
                          {/* Search bar */}
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Cari kode, brand, dept, crew..." value={claimSearchInput} onChange={e => setClaimSearchInput(e.target.value)}
                              className="pl-9 h-9 w-full sm:max-w-md" />
                          </div>
                          {/* Filters row */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Select value={claimFilterProgram || '__all__'} onValueChange={v => { setClaimFilterProgram(v === '__all__' ? '' : v) }}>
                              <SelectTrigger className="h-9 w-auto min-w-[140px] text-xs">
                                <Sparkles className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                                <SelectValue placeholder="Program" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">Semua Program</SelectItem>
                                {programs.map(p => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={claimFilterCrew || '__all__'} onValueChange={v => { setClaimFilterCrew(v === '__all__' ? '' : v) }}>
                              <SelectTrigger className="h-9 w-auto min-w-[160px] text-xs">
                                <Users className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                                <SelectValue placeholder="Semua Crew" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">Semua Crew</SelectItem>
                                {crews.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {/* Date filter inline */}
                            <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted/50 border">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide hidden md:inline">Tanggal</span>
                              <Input type="date" value={claimDateFrom} onChange={e => setClaimDateFrom(e.target.value)} className="h-7 w-[100px] sm:w-[120px] text-xs border-0 shadow-none p-0" />
                              <span className="text-xs text-muted-foreground">–</span>
                              <Input type="date" value={claimDateTo} onChange={e => setClaimDateTo(e.target.value)} className="h-7 w-[100px] sm:w-[120px] text-xs border-0 shadow-none p-0" />
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0" title="Reset tanggal" onClick={() => { setClaimDateFrom(''); setClaimDateTo('') }}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="min-w-0 overflow-hidden">
                      {claimsLoading ? (
                        <div className="space-y-3">
                          <div className="md:hidden space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="sale-card border border-border/40">
                                <div className="p-4">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-[22px] h-[22px] rounded-[7px] skeleton-shimmer" />
                                    <div className="flex-1">
                                      <div className="h-4 skeleton-shimmer rounded-md w-3/4 mb-1.5" />
                                      <div className="h-2.5 skeleton-shimmer rounded-md w-1/2" />
                                    </div>
                                    <div className="h-5 w-16 skeleton-shimmer rounded-full" />
                                  </div>
                                  <div className="h-6 skeleton-shimmer rounded-md w-2/5 mb-3" />
                                  <div className="flex gap-1.5 mb-3">
                                    <div className="h-5 w-16 skeleton-shimmer rounded-md" />
                                    <div className="h-5 w-20 skeleton-shimmer rounded-md" />
                                    <div className="h-5 w-14 skeleton-shimmer rounded-md" />
                                  </div>
                                  <div className="flex items-center gap-2 pt-3 border-t border-border/30">
                                    <div className="w-7 h-7 rounded-full skeleton-shimmer" />
                                    <div className="h-3 skeleton-shimmer rounded-md w-24" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="hidden md:block">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent bg-gradient-to-r from-muted/80 to-muted/40">
                                  <TableHead className="text-[11px]">Tanggal</TableHead>
                                  <TableHead className="text-[11px]">Dept</TableHead>
                                  <TableHead className="text-[11px]">Kode Extend</TableHead>
                                  <TableHead className="text-[11px] text-right">Qty</TableHead>
                                  <TableHead className="text-[11px] text-right">Settle</TableHead>
                                  <TableHead className="text-[11px]">Pembayaran</TableHead>
                                  <TableHead className="text-[11px]">Program</TableHead>
                                  <TableHead className="text-[11px]">Crew</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : claimSales.length === 0 ? (
                        claimShowClaimed === 'unclaimed' ? (
                          <div className="text-center py-12">
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-950/40 dark:to-emerald-900/40 flex items-center justify-center"
                            >
                              <PartyPopper className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
                            </motion.div>
                            <h3 className="text-base font-bold text-foreground mb-1">Semua data sudah di-claim! 🎉</h3>
                            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">Tidak ada data yang belum di-claim pada filter ini</p>
                          </div>
                        ) : claimShowClaimed === 'claimed' ? (
                          <div className="empty-table-state">
                            <div className="empty-icon">
                              <motion.div
                                animate={{ y: [0, -6, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                              >
                                <Clock className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                              </motion.div>
                            </div>
                            <h3>Belum Ada Data yang Di-claim</h3>
                            <p>Data penjualan yang sudah di-claim oleh crew akan muncul di sini</p>
                          </div>
                        ) : (
                        <div className="empty-table-state">
                          <div className="empty-icon">
                            <motion.div
                              animate={{ y: [0, -6, 0] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <FileSpreadsheet className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                            </motion.div>
                          </div>
                          <h3>Belum Ada Data Penjualan</h3>
                          <p className="mb-4">Upload file Excel pertama untuk melihat laporan penjualan lengkap dengan filter, sorting, dan export</p>
                          <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30" onClick={() => setShowUploadModal(true)}>
                            <Upload className="w-3.5 h-3.5 mr-1.5" />Upload Penjualan
                          </Button>
                        </div>
                        )
                      ) : (
                        <>
                          {/* Mobile Card View — Premium */}
                          <div className="md:hidden space-y-3">
                            {sortedClaimSales.map((sale, idx) => {
                              const isSelected = selectedSaleIds.has(sale.id)
                              const isClaimed = !!sale.crew
                              return (
                                <motion.div
                                  key={sale.id}
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: Math.min(idx * 0.03, 0.3), duration: 0.3 }}
                                  className={`sale-card shadow-sm border border-border/40 ${isClaimed ? 'sale-claimed' : ''} ${isSelected ? 'sale-selected' : ''} ${sale.claimedAt && (Date.now() - new Date(sale.claimedAt).getTime() < 120000) ? 'animate-recently-claimed' : ''}`}
                                  onClick={() => setSaleDetailDialog(sale)}
                                >
                                  <div className="p-4">
                                    {/* ── Top: Checkbox + Kode + Status ── */}
                                    <div className="flex items-center gap-3 mb-3">
                                      {!sale.crew && (
                                        <div
                                          onClick={() => {
                                            const next = new Set(selectedSaleIds)
                                            if (next.has(sale.id)) next.delete(sale.id)
                                            else next.add(sale.id)
                                            setSelectedSaleIds(next)
                                          }}
                                          className={`sale-checkbox ${isSelected ? 'checked' : ''}`}
                                        >
                                          {isSelected && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                          )}
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-mono font-bold text-foreground tracking-tight truncate">{sale.kodeExtend}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                          <Calendar className="w-2.5 h-2.5" />
                                          {sale.tanggal}
                                          <span className="text-muted-foreground/40 mx-0.5">·</span>
                                          <Package className="w-2.5 h-2.5" />
                                          {sale.qty} qty
                                        </p>
                                      </div>
                                      {/* Status pill */}
                                      {isClaimed ? (
                                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 shrink-0 ${sale.claimedAt && (Date.now() - new Date(sale.claimedAt).getTime() < 120000) ? 'animate-recently-claimed' : ''}`}>
                                          <CheckCircle2 className={`w-3 h-3 text-emerald-500 ${sale.claimedAt && (Date.now() - new Date(sale.claimedAt).getTime() < 120000) ? 'animate-pulse' : ''}`} />
                                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Claimed</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 shrink-0">
                                          <Clock className="w-3 h-3 text-amber-500" />
                                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Open</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* ── Hero: Settle Amount ── */}
                                    <div className="flex items-end justify-between mb-3">
                                      <p className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
                                        {fmtRp(sale.settle)}
                                      </p>
                                      {sale.claimedAt && (
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                                          {sale.claimedAt && (Date.now() - new Date(sale.claimedAt).getTime() < 120000) && (
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                          )}
                                          {timeAgo(sale.claimedAt)}
                                        </span>
                                      )}
                                    </div>

                                    {/* ── Tag Chips Row ── */}
                                    {(sale.dept || sale.brand || sale.program || sale.pembayaran) && (
                                      <div className="flex flex-wrap gap-1.5 mb-3">
                                        {sale.dept && (
                                          <span className="tag-chip tag-chip-dept">
                                            <div className={`w-1.5 h-1.5 rounded-full ${getDeptColor(sale.dept)}`} />
                                            {sale.dept}
                                          </span>
                                        )}
                                        {sale.brand && (
                                          <span className="tag-chip tag-chip-brand">
                                            {sale.brand.length > 15 ? sale.brand.slice(0, 15) + '…' : sale.brand}
                                          </span>
                                        )}
                                        {sale.program && (
                                          <span className="tag-chip tag-chip-program">
                                            {sale.program.length > 15 ? sale.program.slice(0, 15) + '…' : sale.program}
                                          </span>
                                        )}
                                        {sale.pembayaran && (
                                          <span className={`tag-chip ${getPaymentBadgeClass(sale.pembayaran)}`}>
                                            {getPaymentIcon(sale.pembayaran)}{sale.pembayaran.length > 12 ? sale.pembayaran.slice(0, 12) + '…' : sale.pembayaran}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* ── Crew Section ── */}
                                    <div className={`flex items-center justify-between ${isClaimed && sale.crew ? 'pt-3 border-t border-border/40' : ''}`}>
                                      {sale.crew ? (
                                        <div className="flex items-center gap-2">
                                          <Avatar className="w-7 h-7 ring-2 ring-emerald-200 dark:ring-emerald-800">
                                            <AvatarImage src={sale.crew?.photo || ''} />
                                            <AvatarFallback className="text-[9px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold">
                                              {sale.crew?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-foreground truncate">{sale.crew.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{sale.crew.employeeId}</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 text-muted-foreground/60">
                                          <Search className="w-3.5 h-3.5" />
                                          <span className="text-[11px] italic">Belum di-claim</span>
                                        </div>
                                      )}

                                      {/* Admin actions */}
                                      {isAdmin && (
                                        <div className="flex items-center gap-0.5">
                                          <button onClick={() => openEditSale(sale)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button onClick={() => setDeleteConfirm({ type: 'sale', id: sale.id, name: `${sale.kodeExtend}${sale.crew ? ` — ${sale.crew.name}` : ' (unclaimed)'}` })} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                          {sale.crew && (
                                            <button onClick={() => handleUnclaimSale(sale.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors">
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>

                          {/* Desktop Table View — Premium */}
                          <div className="hidden md:block overflow-x-auto rounded-xl border shadow-sm">
                            <Table className="table-stripe table-row-hover">
                              <TableHeader>
                                <TableRow className="hover:bg-transparent bg-gradient-to-r from-muted/80 to-muted/40">
                                  {/* Select column (for unclaimed rows) */}
                                  <TableHead className="w-[40px]">
                                    <button
                                      className="w-4 h-4 rounded border border-muted-foreground/30 flex items-center justify-center transition-all hover:border-emerald-500"
                                      onClick={() => {
                                        const unclaimed = sortedClaimSales.filter(s => !s.crew)
                                        if (selectedSaleIds.size === unclaimed.length && unclaimed.length > 0) {
                                          setSelectedSaleIds(new Set())
                                        } else {
                                          setSelectedSaleIds(new Set(unclaimed.map(s => s.id)))
                                        }
                                      }}
                                      aria-label="Select all unclaimed rows"
                                    >
                                      {(() => {
                                        const unclaimed = sortedClaimSales.filter(s => !s.crew)
                                        return selectedSaleIds.size === unclaimed.length && unclaimed.length > 0 && (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        )
                                      })()}
                                    </button>
                                  </TableHead>
                                  <TableHead className={`w-[100px] min-w-[100px] cursor-pointer select-none text-[11px] ${claimSortField === 'tanggal' ? 'sort-active-header' : ''}`} onClick={() => { if (claimSortField === 'tanggal') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('tanggal'); setClaimSortDir('desc') } }}>
                                    <span className="inline-flex items-center gap-1">Tanggal{claimSortField === 'tanggal' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                                  </TableHead>
                                  <TableHead className="min-w-[80px] text-[11px]">Dept</TableHead>
                                  <TableHead className="min-w-[120px] text-[11px]">Kode Extend</TableHead>
                                  <TableHead className={`text-right min-w-[60px] cursor-pointer select-none text-[11px] ${claimSortField === 'qty' ? 'sort-active-header' : ''}`} onClick={() => { if (claimSortField === 'qty') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('qty'); setClaimSortDir('desc') } }}>
                                    <span className="inline-flex items-center justify-end gap-1">Qty{claimSortField === 'qty' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                                  </TableHead>
                                  <TableHead className={`text-right min-w-[110px] cursor-pointer select-none text-[11px] ${claimSortField === 'settle' ? 'sort-active-header' : ''}`} onClick={() => { if (claimSortField === 'settle') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('settle'); setClaimSortDir('desc') } }}>
                                    <span className="inline-flex items-center justify-end gap-1">Settle{claimSortField === 'settle' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                                  </TableHead>
                                  <TableHead className="min-w-[80px] text-[11px]">Pembayaran</TableHead>
                                  <TableHead className="min-w-[80px] text-[11px]">Program</TableHead>
                                  <TableHead className="min-w-[160px] text-[11px]">Crew</TableHead>
                                  {isAdmin && <TableHead className="w-[80px] text-[11px]">Aksi</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sortedClaimSales.map((sale) => (
                                  <TableRow
                                    key={sale.id}
                                    className={`sale-row sale-row-accent ${selectedSaleIds.has(sale.id) ? 'row-selected' : ''} ${batchSelectedIds.has(sale.id) ? 'bg-red-50/50 dark:bg-red-950/10' : ''} ${sale.crew ? 'row-claimed-accent' : ''}`}
                                  >
                                    {/* Checkbox — only for unclaimed */}
                                    <TableCell>
                                      {!sale.crew ? (
                                        <button
                                          className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 mx-auto"
                                          style={{ backgroundColor: selectedSaleIds.has(sale.id) ? '#059669' : 'transparent', borderColor: selectedSaleIds.has(sale.id) ? '#059669' : 'rgb(156 163 175)' }}
                                          onClick={() => {
                                            const next = new Set(selectedSaleIds)
                                            if (next.has(sale.id)) next.delete(sale.id)
                                            else next.add(sale.id)
                                            setSelectedSaleIds(next)
                                          }}
                                        >
                                          {selectedSaleIds.has(sale.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </button>
                                      ) : isAdmin ? (
                                        <button
                                          className="w-4 h-4 rounded border border-muted-foreground/30 flex items-center justify-center transition-all hover:border-emerald-500 shrink-0 mx-auto"
                                          onClick={() => {
                                            const next = new Set(batchSelectedIds)
                                            if (next.has(sale.id)) next.delete(sale.id)
                                            else next.add(sale.id)
                                            setBatchSelectedIds(next)
                                          }}
                                          aria-label={`Select ${sale.kodeExtend}`}
                                        >
                                          {batchSelectedIds.has(sale.id) && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                        </button>
                                      ) : null}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{sale.tanggal}</TableCell>
                                    <TableCell className="text-xs">
                                      <div className="flex items-center gap-1.5">
                                        {sale.dept && <div className={`w-2 h-2 rounded-full ${getDeptColor(sale.dept)} shrink-0`} />}
                                        {sale.dept && <span className="tag-chip tag-chip-dept">{sale.dept}</span>}
                                        {!sale.dept && <span className="text-muted-foreground">-</span>}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono whitespace-nowrap font-semibold text-foreground">
                                      <button onClick={() => setSaleDetailDialog(sale)} className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline underline-offset-2 transition-colors">{sale.kodeExtend}</button>
                                    </TableCell>
                                    <TableCell className="text-xs text-right tabular-nums">{sale.qty}</TableCell>
                                    <TableCell className="text-xs text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums">{fmtRp(sale.settle)}</TableCell>
                                    {/* Pembayaran column */}
                                    <TableCell>
                                      {sale.pembayaran ? (
                                        <span className={`tag-chip ${getPaymentBadgeClass(sale.pembayaran)}`}>{getPaymentIcon(sale.pembayaran)}{sale.pembayaran}</span>
                                      ) : <span className="text-xs text-muted-foreground">-</span>}
                                    </TableCell>
                                    {/* Program column */}
                                    <TableCell>
                                      {sale.program ? (
                                        <span className="tag-chip tag-chip-program">{sale.program}</span>
                                      ) : <span className="text-xs text-muted-foreground">-</span>}
                                    </TableCell>
                                    {/* Crew column */}
                                    <TableCell>
                                      {sale.crew ? (
                                        <div className="flex items-center gap-2">
                                          <div className="relative">
                                            <Avatar className="w-7 h-7 ring-1 ring-emerald-200 dark:ring-emerald-800">
                                              <AvatarImage src={sale.crew?.photo || ''} />
                                              <AvatarFallback className="text-[9px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold">{(sale.crew?.name || '?')[0]}</AvatarFallback>
                                            </Avatar>
                                            {sale.claimedAt && (Date.now() - new Date(sale.claimedAt).getTime() < 120000) && (
                                              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                                            )}
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-xs truncate max-w-[120px] font-semibold text-foreground">{sale.crew?.name || 'Unknown'}</span>
                                            {sale.claimedAt && (
                                              <span className="text-[9px] text-muted-foreground">{timeAgo(sale.claimedAt)}</span>
                                            )}
                                          </div>
                                          {isAdmin && (
                                            <button
                                              onClick={() => handleUnclaimSale(sale.id)}
                                              className="ml-auto shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                              title="Unclaim"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 text-muted-foreground/60">
                                          <Search className="w-3.5 h-3.5 shrink-0" />
                                          <span className="text-xs italic">Belum di-claim</span>
                                        </div>
                                      )}
                                    </TableCell>
                                    {isAdmin && (
                                      <TableCell>
                                        <div className="flex items-center gap-0.5">
                                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => openEditSale(sale)}>
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setDeleteConfirm({ type: 'sale', id: sale.id, name: `${sale.kodeExtend}${sale.crew ? ` — ${sale.crew.name}` : ' (unclaimed)'}` })}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Section 5: Pagination */}
                          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
                            <p className="text-xs text-muted-foreground">
                              {claimTotal > 0 && `Menampilkan ${claimSales.length} dari ${fmtNum(claimTotal)}`}
                            </p>
                            <div className="flex items-center gap-2">
                              <button className="pagination-btn border border-border" disabled={claimPage <= 1} onClick={() => fetchClaims(claimPage - 1)}>
                                <ChevronLeft className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Prev</span>
                              </button>
                              <div className="flex items-center gap-0.5">
                                {getPageNumbers(claimPage, claimTotalPages).map((p, idx) => (
                                  p === '...' ? (
                                    <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">···</span>
                                  ) : (
                                    <button
                                      key={p}
                                      onClick={() => fetchClaims(p)}
                                      className={`pagination-btn ${p === claimPage ? 'active' : 'text-muted-foreground border border-transparent'}`}
                                    >
                                      {p}
                                    </button>
                                  )
                                ))}
                              </div>
                              <button className="pagination-btn border border-border" disabled={claimPage >= claimTotalPages} onClick={() => fetchClaims(claimPage + 1)}>
                                <span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4 ml-1" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* ── Mobile Selected Items Bar removed — merged into Floating Claim Bar below ── */}
              </motion.div>
                </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* ─── Management Tab ───────────────────────── */}
            <TabsContent value="management" className="mt-4 sm:mt-6 pb-24 md:pb-8" forceMount style={{ display: activeTab === 'management' ? 'block' : 'none' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'management' && (
                  <motion.div key="management" {...tabTransition}>
              {!isAdmin ? (
                <motion.div {...fadeIn} className="max-w-md mx-auto">
                  <Card className="border-0 shadow-2xl overflow-hidden login-card-pattern card-scale-hover">
                    <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 animate-gradient-bg p-6 text-center relative">
                      {/* Dot pattern overlay */}
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                      {/* Floating Particles */}
                      <div className="login-particles">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div key={i} className="login-particle" style={{ '--left': `${10 + (i * 7) % 85}%`, '--delay': `${(i * 0.4) % 3}s`, '--duration': `${3 + (i % 3)}s`, '--drift': `${(i % 2 === 0 ? 1 : -1) * (10 + i * 3)}px` } as React.CSSProperties} />
                        ))}
                      </div>
                      <div className="relative z-10">
                        {/* Company Logo Placeholder */}
                        <div className="w-18 h-18 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 border border-white/20 shadow-lg">
                          <div className="w-14 h-14 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center">
                            <Layers className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <h2 className="text-xl font-bold login-gradient-title">CMS Crew Management</h2>
                        <p className="text-emerald-100 text-sm mt-1">Masuk untuk mengelola crew dan group</p>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" placeholder="admin" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleLogin()} className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleLogin()} className="h-11" />
                      </div>
                      <Button onClick={handleLogin} className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/25 text-sm font-semibold login-btn-pulse">
                        <Shield className="w-4 h-4 mr-2" />Masuk
                      </Button>
                      <div className="text-center space-y-1.5">
                        <p className="text-[10px] text-center text-muted-foreground">Hubungi admin untuk akses</p>
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                          <span className="text-[10px] text-muted-foreground/60 font-mono">CMS v1.0 — Ahtjong Labs</span>
                          <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div {...stagger} className="space-y-6">
                  <Tabs defaultValue="crews">
                    {/* Management Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: 'Total Crew', value: mgmtCrews.length, icon: Users, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
                        { label: 'Total Group', value: groups.length, icon: Target, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
                        { label: 'Total Sales', value: mgmtCrews.reduce((s, c) => s + c.totalSales, 0), icon: DollarSign, gradient: 'from-cyan-500 to-sky-600', shadow: 'shadow-cyan-500/20' },
                      ].map((s, i) => (
                        <motion.div key={i} whileHover={{ y: -2, transition: { type: 'spring', stiffness: 300 } }}>
                          <Card className="border-0 shadow-md overflow-hidden">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">{s.label}</p>
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.gradient} ${s.shadow} shadow flex items-center justify-center`}>
                                  <s.icon className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                              <p className="text-sm sm:text-lg font-bold tracking-tight truncate">{i === 2 ? fmtRp(s.value) : fmtNum(s.value)}</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                    <TabsList className="bg-muted rounded-xl p-1">
                      <TabsTrigger value="crews" className="rounded-lg"><Users className="w-4 h-4 mr-2" />Crew</TabsTrigger>
                      <TabsTrigger value="groups" className="rounded-lg"><Target className="w-4 h-4 mr-2" />Group / Zoning</TabsTrigger>
                    </TabsList>

                    {/* Management Search */}
                    <div className="relative w-full sm:max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari crew, ID, atau group..."
                        value={mgmtSearch}
                        onChange={e => setMgmtSearch(e.target.value)}
                        className="pl-9 h-9 w-full"
                      />
                      {mgmtSearch && (
                        <button
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                          onClick={() => setMgmtSearch('')}
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Crew Management */}
                    <TabsContent value="crews" className="mt-4">
                      <motion.div {...fadeIn} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">{filteredMgmtCrews.length} crew terdaftar{mgmtSearch && ` (filter: ${mgmtSearch})`}</p>
                          <Dialog open={showAddCrew} onOpenChange={setShowAddCrew}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-1" />Tambah Crew</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <CrewForm groups={groups} onSave={handleSaveCrew} onCancel={() => setShowAddCrew(false)} />
                            </DialogContent>
                          </Dialog>
                        </div>

                        {/* Crew Table */}
                        <Card className="border-0 shadow-lg overflow-hidden card-hover-glow card-scale-hover">
                          {/* Mobile Card View */}
                          <div className="md:hidden p-3 space-y-2">
                            {filteredMgmtCrews.map(crew => (
                              <div key={crew.id} className="p-3 rounded-lg border bg-white dark:bg-gray-900">
                                <div className="flex items-center gap-2.5 mb-2">
                                  <Avatar className="w-9 h-9">
                                    <AvatarImage src={crew.photo || ''} />
                                    <AvatarFallback className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                      {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{crew.name}</p>
                                    <p className="text-[11px] text-muted-foreground font-mono">{crew.employeeId}</p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditCrew(crew); setShowAddCrew(true) }}>
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm({ type: 'crew', id: crew.id, name: crew.name })}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px]">{crew.group?.name}</Badge>
                                  <span className="font-semibold text-foreground">{fmtRp(crew.totalSales)}</span>
                                </div>
                              </div>
                            ))}
                            {filteredMgmtCrews.length === 0 && (
                              <p className="text-center py-8 text-muted-foreground text-sm">{mgmtSearch ? 'Tidak ditemukan crew yang cocok' : 'Belum ada crew'}</p>
                            )}
                          </div>
                          {/* Desktop Table View */}
                          <div className="hidden md:block overflow-x-auto">
                            <Table className="table-stripe table-sticky-head table-row-hover">
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead>Crew</TableHead>
                                  <TableHead>ID Karyawan</TableHead>
                                  <TableHead>Group</TableHead>
                                  <TableHead className="text-right">Total Sales</TableHead>
                                  <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredMgmtCrews.map(crew => (
                                  <TableRow key={crew.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Avatar className="w-8 h-8">
                                          <AvatarImage src={crew.photo || ''} />
                                          <AvatarFallback className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                            {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium text-sm">{crew.name}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground">{crew.employeeId}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs">{crew.group?.name}</Badge></TableCell>
                                    <TableCell className="text-right text-sm font-semibold">{fmtRp(crew.totalSales)}</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditCrew(crew); setShowAddCrew(true) }}>
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm({ type: 'crew', id: crew.id, name: crew.name })}>
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {filteredMgmtCrews.length === 0 && (
                                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">{mgmtSearch ? 'Tidak ditemukan crew yang cocok' : 'Belum ada crew'}</TableCell></TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </Card>

                        {/* Crew Performance Chart */}
                        {mgmtCrews.length > 0 && (
                          <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
                            <Card className="border-0 shadow-lg overflow-hidden card-hover-glow card-scale-hover">
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                                  <CardTitle className="text-sm font-semibold">Performa Crew — Total Sales</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="h-[240px] w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={mgmtCrews.sort((a, b) => b.totalSales - a.totalSales).map(c => ({ name: c.name.split(' ')[0], sales: c.totalSales, group: c.group?.name }))} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                                      <defs>
                                        <linearGradient id="mgmtBarGrad" x1="0" y1="0" x2="1" y2="0">
                                          <stop offset="0%" stopColor="#059669" stopOpacity={0.9} />
                                          <stop offset="100%" stopColor="#34d399" stopOpacity={0.7} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" className="opacity-20" />
                                      <XAxis type="number" tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} fontSize={11} />
                                      <YAxis type="category" dataKey="name" width={80} fontSize={11} tick={{ fill: 'oklch(0.4 0 0)' }} />
                                      <Tooltip content={<ChartTooltip />} />
                                      <Bar dataKey="sales" radius={[0, 6, 6, 0]} fill="url(#mgmtBarGrad)">
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}

                        {/* Edit Crew Dialog */}
                        <Dialog open={showAddCrew && !!editCrew} onOpenChange={open => { if (!open) { setEditCrew(null); setShowAddCrew(false) } }}>
                          <DialogContent>
                            {editCrew && (
                              <CrewForm crew={editCrew} groups={groups} onSave={handleSaveCrew} onCancel={() => { setEditCrew(null); setShowAddCrew(false) }} />
                            )}
                          </DialogContent>
                        </Dialog>
                      </motion.div>
                    </TabsContent>

                    {/* Group Management */}
                    <TabsContent value="groups" className="mt-4">
                      <motion.div {...fadeIn} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">{filteredGroups.length} group terdaftar{mgmtSearch && ` (filter: ${mgmtSearch})`}</p>
                          <Dialog open={showAddGroup} onOpenChange={setShowAddGroup}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-1" />Tambah Group</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <GroupForm onSave={handleSaveGroup} onCancel={() => setShowAddGroup(false)} />
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          {filteredGroups.map(group => (
                            <motion.div key={group.id} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
                              <Card className="border-0 shadow-md overflow-hidden">
                                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 flex items-center gap-3">
                                  <Avatar className="w-12 h-12 border-2 border-emerald-200">
                                    <AvatarImage src={group.logo || ''} />
                                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold">
                                      {group.name.split(' ').slice(-1)[0][0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-bold text-sm">{group.name}</p>
                                    <p className="text-xs text-muted-foreground">{group.crewCount} crew • Target: {fmtRp(group.monthlyTarget)}</p>
                                  </div>
                                </div>
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-4 gap-2 mb-3">
                                    {[{ w: 1, t: group.week1Target }, { w: 2, t: group.week2Target }, { w: 3, t: group.week3Target }, { w: 4, t: group.week4Target }].map(week => (
                                      <div key={week.w} className="text-center p-2 rounded-lg bg-muted/50">
                                        <p className="text-[10px] text-muted-foreground">W{week.w}</p>
                                        <p className="text-sm font-bold">{week.t}%</p>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditGroup(group); setShowAddGroup(true) }}>
                                      <Edit2 className="w-3.5 h-3.5 mr-1" />Edit
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm({ type: 'group', id: group.id, name: group.name })}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                          {groups.length === 0 && (
                            <p className="text-center py-8 text-muted-foreground text-sm col-span-2">Belum ada group</p>
                          )}
                        </div>

                        {/* Edit Group Dialog */}
                        <Dialog open={showAddGroup && !!editGroup} onOpenChange={open => { if (!open) { setEditGroup(null); setShowAddGroup(false) } }}>
                          <DialogContent className="max-w-lg">
                            {editGroup && (
                              <GroupForm group={editGroup} onSave={handleSaveGroup} onCancel={() => { setEditGroup(null); setShowAddGroup(false) }} />
                            )}
                          </DialogContent>
                        </Dialog>
                      </motion.div>
                    </TabsContent>
                  </Tabs>
                </motion.div>
              )}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ─── Crew Detail Slide Panel ──────────────────── */}
      <AnimatePresence>
        {selectedCrewDetail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSelectedCrewDetail(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white dark:bg-gray-900 border-l shadow-2xl z-50 overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Statistik Crew</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCrewDetail(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar className="w-14 h-14 border-2 border-emerald-200 dark:border-emerald-800">
                    <AvatarImage src={selectedCrewDetail.photo || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-lg">
                      {selectedCrewDetail.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold">{selectedCrewDetail.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCrewDetail.groupName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{selectedCrewDetail.employeeId}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Hari Ini', value: selectedCrewDetail.todayTotal, qty: selectedCrewDetail.todayQty, struk: selectedCrewDetail.todayStruk, icon: Zap, color: 'from-emerald-500 to-teal-600' },
                    { label: 'Minggu Ini', value: selectedCrewDetail.weekTotal, qty: selectedCrewDetail.weekQty, struk: selectedCrewDetail.weekStruk, icon: TrendingUp, color: 'from-amber-500 to-orange-600' },
                    { label: 'Bulan Ini', value: selectedCrewDetail.monthTotal, qty: selectedCrewDetail.monthQty, struk: selectedCrewDetail.monthStruk, icon: BarChart3, color: 'from-purple-500 to-violet-600' },
                    { label: 'All Time', value: selectedCrewDetail.allTimeTotal, qty: selectedCrewDetail.allTimeQty, struk: selectedCrewDetail.allTimeStruk, icon: Flame, color: 'from-cyan-500 to-sky-600' },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                      <div className="flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                          <s.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <p className="font-bold">{fmtRp(s.value)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5">{fmtNum(s.qty)} qty</Badge>
                          <span className="text-[10px] text-muted-foreground">{fmtNum(s.struk)} struk</span>
                        </div>
                      </div>
                      {/* Basket Size & Price Point row */}
                      <div className="ml-13 mt-1 flex items-center gap-3 text-[10px] px-1">
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          🧺 Basket: {(s.struk > 0 ? (s.qty / s.struk).toFixed(2) : '0.00')}
                        </span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                          💰 Price Point: {fmtRp(s.qty > 0 ? Math.round(s.value / s.qty) : 0)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border text-center">
                  <p className="text-xs text-muted-foreground">Total Transaksi (item rows)</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmtNum(selectedCrewDetail.transactionCount)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{fmtNum(selectedCrewDetail.allTimeStruk)} struk unik (id transaksi)</p>
                </div>

                {/* ─── Target Achievement ─── */}
                {selectedCrewDetail.crewMonthlyTarget > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Target className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h4 className="font-bold text-sm">Target & Pencapaian</h4>
                    </div>

                    {/* Monthly Target */}
                    <div className="p-3 rounded-xl border bg-white dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground font-medium">Target Bulanan</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{fmtRp(selectedCrewDetail.crewMonthlyTarget)}</span>
                          {selectedCrewDetail.monthlyAchievement >= 100 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold">🎉 OVER</span>
                          )}
                        </div>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(selectedCrewDetail.monthlyAchievement, 100)}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                          className={`h-full rounded-full ${getAchievementColor(selectedCrewDetail.monthlyAchievement).bar}`} />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-xs font-bold ${getAchievementColor(selectedCrewDetail.monthlyAchievement).text}`}>
                          {Math.round(selectedCrewDetail.monthlyAchievement)}% tercapai
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{fmtRp(selectedCrewDetail.monthTotal)}</span>
                      </div>
                    </div>

                    {/* Weekly Target */}
                    <div className="p-3 rounded-xl border bg-white dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground font-medium">Target Minggu {dashboard?.dateInfo?.currentWeek || '?'}</span>
                        <span className="text-xs text-muted-foreground">{fmtRp(selectedCrewDetail.crewWeeklyTarget)}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(selectedCrewDetail.weeklyAchievement, 100)}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                          className={`h-full rounded-full ${getAchievementColor(selectedCrewDetail.weeklyAchievement).bar}`} />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-xs font-bold ${getAchievementColor(selectedCrewDetail.weeklyAchievement).text}`}>
                          {Math.round(selectedCrewDetail.weeklyAchievement)}% tercapai
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{fmtRp(selectedCrewDetail.weekTotal)}</span>
                      </div>
                    </div>

                    {/* Week Breakdown */}
                    <div className="p-3 rounded-xl border bg-white dark:bg-gray-800">
                      <p className="text-xs text-muted-foreground font-medium mb-2">Breakdown Mingguan</p>
                      <div className="flex gap-2 items-end">
                        {selectedCrewDetail.weekTargets.map((wt, wIdx) => {
                          const maxWt = Math.max(...selectedCrewDetail.weekTargets, 1)
                          const hPct = Math.round((wt / maxWt) * 100)
                          const isCurrentWeek = wIdx + 1 === (dashboard?.dateInfo?.currentWeek || 1)
                          const weekAch = selectedCrewDetail.weekAchievements?.[wIdx]
                          return (
                            <div key={wIdx} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[9px] text-muted-foreground tabular-nums">{fmtRp(Math.round(wt / 1000000))}jt</span>
                              <div className={`w-full rounded-md transition-all ${isCurrentWeek ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-muted'}`}
                                style={{ height: `${Math.max(hPct, 12)}%`, minHeight: '16px' }} />
                              <span className={`text-[9px] font-medium ${isCurrentWeek ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                W{wIdx + 1}
                              </span>
                              {weekAch !== undefined && weekAch > 0 && (
                                <span className={`text-[8px] font-bold ${getAchievementColor(weekAch).text}`}>
                                  {Math.round(weekAch)}%
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Group/Zoning Detail Modal ──────────────── */}
      <AnimatePresence>
        {selectedGroupDetail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSelectedGroupDetail(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-2 sm:inset-6 md:inset-10 lg:inset-16 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-gray-800 dark:to-gray-900 shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-emerald-200 dark:border-emerald-700">
                    <AvatarImage src={selectedGroupDetail.logo || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold">
                      {selectedGroupDetail.name.split(' ').slice(-1)[0][0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold">{selectedGroupDetail.name}</h3>
                    <p className="text-xs text-muted-foreground">Detail Performa Crew per Periode</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Period filter tabs */}
                  <div className="flex items-center bg-muted/80 rounded-lg p-0.5">
                    {([['daily', 'Harian'], ['weekly', 'Mingguan'], ['monthly', 'Bulanan']] as const).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setGroupDetailPeriod(key)}
                        className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-all duration-200 ${
                          groupDetailPeriod === key
                            ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedGroupDetail(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {groupDetailLoading || !groupDetailData ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 bg-muted rounded-xl" />
                      ))}
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 bg-muted rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Period label */}
                    <p className="text-sm text-muted-foreground text-center">
                      Periode: <span className="font-semibold text-foreground">{groupDetailData.period}</span>
                    </p>

                    {/* Group Target Achievement */}
                    {selectedGroupDetail.monthlyTarget > 0 && (
                      <div className="p-4 rounded-xl border bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Target className="w-3.5 h-3.5 text-white" />
                          </div>
                          <h4 className="font-bold text-sm">Target Group</h4>
                          {selectedGroupDetail.monthlyAchievement >= 100 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold">🎉 OVER</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Target Bulanan</p>
                            <p className="text-sm font-bold tabular-nums">{fmtRp(selectedGroupDetail.monthlyTarget)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Pencapaian</p>
                            <p className={`text-sm font-bold ${getAchievementColor(selectedGroupDetail.monthlyAchievement).text}`}>{Math.round(selectedGroupDetail.monthlyAchievement)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Target Minggu {selectedGroupDetail.currentWeek}</p>
                            <p className="text-sm font-bold tabular-nums">{fmtRp(selectedGroupDetail.weeklyTarget)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Ach. Mingguan</p>
                            <p className={`text-sm font-bold ${getAchievementColor(selectedGroupDetail.weeklyAchievement).text}`}>{Math.round(selectedGroupDetail.weeklyAchievement)}%</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(selectedGroupDetail.monthlyAchievement, 100)}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                              className={`h-full rounded-full ${getAchievementColor(selectedGroupDetail.monthlyAchievement).bar}`} />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground">{fmtRp(selectedGroupDetail.monthlyTotal)} dari {fmtRp(selectedGroupDetail.monthlyTarget)}</span>
                            <span className="text-[10px] text-muted-foreground">{selectedGroupDetail.crewCount} crew</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Group Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        { label: 'Total Qty', value: fmtNum(groupDetailData.groupTotal.qty), icon: Package, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
                        { label: 'Total Penjualan', value: fmtRp(groupDetailData.groupTotal.settle), icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
                        { label: 'Total Struk', value: fmtNum(groupDetailData.groupTotal.struk), icon: ShoppingCart, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20' },
                        { label: 'Basket Size', value: groupDetailData.groupTotal.basketSize.toFixed(2), icon: Layers, gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20' },
                        { label: 'Price Point', value: fmtRp(groupDetailData.groupTotal.pricePoint), icon: Percent, gradient: 'from-cyan-500 to-sky-600', shadow: 'shadow-cyan-500/20' },
                      ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                          <div className="p-3 rounded-xl border bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900 text-center">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.gradient} ${s.shadow} shadow flex items-center justify-center mx-auto mb-1.5`}>
                              <s.icon className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                            <p className="text-sm font-bold truncate">{s.value}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Crew List */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <h4 className="font-bold text-sm">Daftar Crew ({groupDetailData.crews.length})</h4>
                      </div>

                      {groupDetailData.crews.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Belum ada data crew untuk periode ini</p>
                        </div>
                      ) : (
                        <>
                          {/* Desktop Table */}
                          <div className="hidden md:block rounded-xl border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-[10px] uppercase tracking-wider">#</TableHead>
                                  <TableHead className="text-[10px] uppercase tracking-wider">Crew</TableHead>
                                  <TableHead className="text-[10px] uppercase tracking-wider text-right">Total Qty</TableHead>
                                  <TableHead className="text-[10px] uppercase tracking-wider text-right">Penjualan</TableHead>
                                  <TableHead className="text-[10px] uppercase tracking-wider text-right">Struk</TableHead>
                                  <TableHead className="text-[10px] uppercase tracking-wider text-right">Basket Size</TableHead>
                                  <TableHead className="text-[10px] uppercase tracking-wider text-right">Price Point</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {groupDetailData.crews.map((c, idx) => (
                                  <TableRow key={c.id} className={`transition-colors ${idx === 0 ? 'bg-amber-50/50 dark:bg-amber-950/10' : 'hover:bg-muted/50'}`}>
                                    <TableCell>
                                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-bold">
                                        {idx + 1}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Avatar className="w-7 h-7">
                                          <AvatarImage src={c.photo || ''} />
                                          <AvatarFallback className="text-[9px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                            {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="text-xs font-semibold">{c.name}</p>
                                          <p className="text-[10px] text-muted-foreground font-mono">{c.employeeId}</p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-medium tabular-nums">{fmtNum(c.totalQty)}</TableCell>
                                    <TableCell className="text-right text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtRp(c.totalSettle)}</TableCell>
                                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{fmtNum(c.totalStruk)}</TableCell>
                                    <TableCell className="text-right text-xs tabular-nums font-medium text-purple-600 dark:text-purple-400">{c.basketSize.toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-xs tabular-nums font-medium text-cyan-600 dark:text-cyan-400">{fmtRp(c.pricePoint)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Mobile Cards */}
                          <div className="md:hidden space-y-3">
                            {groupDetailData.crews.map((c, idx) => (
                              <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                                <div className={`p-3 rounded-xl border ${idx === 0 ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/30' : 'bg-white dark:bg-gray-800'}`}>
                                  {/* Crew header */}
                                  <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-bold shrink-0">
                                      {idx + 1}
                                    </div>
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={c.photo || ''} />
                                      <AvatarFallback className="text-[9px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                        {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold truncate">{c.name}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">{c.employeeId}</p>
                                    </div>
                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{fmtRp(c.totalSettle)}</p>
                                  </div>
                                  {/* Stats grid */}
                                  <div className="grid grid-cols-4 gap-2">
                                    <div className="text-center p-1.5 rounded-lg bg-muted/50">
                                      <p className="text-[9px] text-muted-foreground">Qty</p>
                                      <p className="text-xs font-bold tabular-nums">{fmtNum(c.totalQty)}</p>
                                    </div>
                                    <div className="text-center p-1.5 rounded-lg bg-muted/50">
                                      <p className="text-[9px] text-muted-foreground">Struk</p>
                                      <p className="text-xs font-bold tabular-nums">{fmtNum(c.totalStruk)}</p>
                                    </div>
                                    <div className="text-center p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                                      <p className="text-[9px] text-purple-600 dark:text-purple-400">Basket</p>
                                      <p className="text-xs font-bold tabular-nums text-purple-700 dark:text-purple-300">{c.basketSize.toFixed(2)}</p>
                                    </div>
                                    <div className="text-center p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
                                      <p className="text-[9px] text-cyan-600 dark:text-cyan-400">Price Pt</p>
                                      <p className="text-xs font-bold tabular-nums text-cyan-700 dark:text-cyan-300">{fmtRp(c.pricePoint)}</p>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription>
              {"Apakah Anda yakin ingin menghapus "}
              <strong>{deleteConfirm?.name}</strong>
              {"?"}
              {deleteConfirm?.type === 'group' && (
                <span className="block mt-1 text-red-500">
                  Semua crew dalam group ini juga akan dihapus.
                </span>
              )}
              {deleteConfirm?.type === 'sale' && (
                <span className="block mt-1 text-red-500">
                  Data penjualan ini akan dihapus secara permanen.
                </span>
              )}
              {deleteConfirm?.type === 'batch-sale' && (
                <span className="block mt-1 text-red-500">
                  {deleteConfirm.ids?.length || 0} data penjualan terpilih akan dihapus secara permanen.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={batchDeleting}
              onClick={async () => {
                if (!deleteConfirm || !deleteConfirm.id) return
                if (deleteConfirm.type === 'crew') await handleDeleteCrew(deleteConfirm.id)
                else if (deleteConfirm.type === 'group') await handleDeleteGroup(deleteConfirm.id)
                else if (deleteConfirm.type === 'sale') await handleDeleteSale(deleteConfirm.id)
                else if (deleteConfirm.type === 'batch-sale') await handleBatchDeleteSales(deleteConfirm.ids || [])
                setDeleteConfirm(null)
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> {batchDeleting ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Sale Dialog (Admin Only) ─── */}
      <Dialog open={!!editSaleDialog} onOpenChange={() => setEditSaleDialog(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-500" />
              Edit Data Penjualan
            </DialogTitle>
            <DialogDescription>Ubah data penjualan atau pindahkan ke crew lain</DialogDescription>
          </DialogHeader>
          {editSaleDialog && (
            <div className="space-y-4">
              {/* Crew assignment */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crew (Claim)</Label>
                <Select value={editSaleForm.crewId} onValueChange={v => setEditSaleForm(f => ({ ...f, crewId: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih crew..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Belum di-claim (Unclaim) —</SelectItem>
                    {crews.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.employeeId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editSaleDialog.crew && editSaleForm.crewId === '__none__' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Data akan di-unclaim dari {editSaleDialog.crew.name}</p>
                )}
              </div>
              <Separator />
              {/* Product details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tanggal</Label>
                  <Input type="date" value={editSaleForm.tanggal} onChange={e => setEditSaleForm(f => ({ ...f, tanggal: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" min={0} value={editSaleForm.qty} onChange={e => setEditSaleForm(f => ({ ...f, qty: Number(e.target.value) || 0 }))} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Kode Extend</Label>
                  <Input value={editSaleForm.kodeExtend} onChange={e => setEditSaleForm(f => ({ ...f, kodeExtend: e.target.value }))} className="font-mono" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Settle (Rp)</Label>
                  <Input type="number" min={0} step={0.01} value={editSaleForm.settle} onChange={e => setEditSaleForm(f => ({ ...f, settle: Number(e.target.value) || 0 }))} className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Dept</Label>
                  <Input value={editSaleForm.dept} onChange={e => setEditSaleForm(f => ({ ...f, dept: e.target.value }))} placeholder="Departemen" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Brand</Label>
                  <Input value={editSaleForm.brand} onChange={e => setEditSaleForm(f => ({ ...f, brand: e.target.value }))} placeholder="Brand" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Modul</Label>
                  <Input value={editSaleForm.modul} onChange={e => setEditSaleForm(f => ({ ...f, modul: e.target.value }))} placeholder="Modul" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pembayaran</Label>
                  <Input value={editSaleForm.pembayaran} onChange={e => setEditSaleForm(f => ({ ...f, pembayaran: e.target.value }))} placeholder="Metode pembayaran" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Program</Label>
                  <Input value={editSaleForm.program} onChange={e => setEditSaleForm(f => ({ ...f, program: e.target.value }))} placeholder="Program" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditSaleDialog(null)}>Batal</Button>
            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25"
              disabled={editSaleSaving || !editSaleForm.kodeExtend || !editSaleForm.tanggal}
              onClick={handleSaveEditSale}
            >
              {editSaleSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="mt-auto bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl pb-20 md:pb-0 footer-gradient-border">
        {/* Top accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Main footer content */}
          <div className="py-6 sm:py-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {/* Brand */}
              <div className="col-span-2 sm:col-span-1 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-500/15">
                    <Layers className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">CMS Crew</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Management System</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[220px]">
                  Platform manajemen crew & tracking penjualan terintegrasi. Dibangun oleh Ahtjong Labs.
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400">v3.0</Badge>
                  <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0"><Code2 className="w-2.5 h-2.5 mr-0.5" />PWA</Badge>
                </div>
              </div>

              {/* Navigation */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-widest">Menu</p>
                <div className="space-y-1.5">
                  {navItems.map(t => (
                    <button key={t.val} onClick={() => { setActiveTab(t.val); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-0.5">
                      <t.icon className="w-3 h-3" />{t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tech Stack */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-widest">Teknologi</p>
                <div className="space-y-1.5">
                  {[
                    { icon: Monitor, label: 'Next.js 16' },
                    { icon: Briefcase, label: 'Prisma ORM' },
                    { icon: Beaker, label: 'Tailwind CSS' },
                    { icon: Sparkles, label: 'Framer Motion' },
                  ].map(t => (
                    <div key={t.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <t.icon className="w-3 h-3 text-emerald-500/50" />{t.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* System */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-widest">Sistem</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-emerald-500/50" />
                    <span className="text-xs text-muted-foreground">GMT+7 (WIB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3 h-3 text-emerald-500/50" />
                    <span className="text-xs text-muted-foreground">PWA Ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-emerald-500/50" />
                    <span className="text-xs text-muted-foreground">Admin Auth</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="py-3 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[10px] text-muted-foreground text-center sm:text-left">
              © {currentYear} <span className="font-semibold text-foreground/70">Ahtjong Labs</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {/* Keyboard shortcuts button */}
              <button
                onClick={() => setShowShortcutsDialog(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title="Keyboard Shortcuts"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Shortcuts</span>
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md border border-border bg-muted/50 text-[10px] font-mono">?</kbd>
              </button>
              {/* Social Icons Placeholder */}
              <div className="flex items-center gap-2">
                <button className="social-icon p-1.5 rounded-lg hover:bg-muted/50 transition-colors" aria-label="GitHub">
                  <Code2 className="w-3.5 h-3.5" />
                </button>
                <button className="social-icon p-1.5 rounded-lg hover:bg-muted/50 transition-colors" aria-label="Website">
                  <Globe className="w-3.5 h-3.5" />
                </button>
                <button className="social-icon p-1.5 rounded-lg hover:bg-muted/50 transition-colors" aria-label="Email">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Made with</span>
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                <span className="text-[10px] text-muted-foreground">in Indonesia</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Back to Top Button ────────────────────────── */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed right-4 sm:right-6 z-40 w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center transition-colors"
            style={{ bottom: 'max(5rem, env(safe-area-inset-bottom, 5rem))' }}
            aria-label="Back to top"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── Quick Actions FAB (Mobile Only) ──────────── */}
      <div className="md:hidden fixed left-4 z-40" style={{ bottom: 'max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem))' }}>
        <AnimatePresence>
          {!showFabMenu && (
            <motion.button
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
              onClick={() => setShowFabMenu(true)}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all animate-fab-bounce"
              aria-label="Quick Actions"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* FAB Menu Overlay */}
      <AnimatePresence>
        {showFabMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFabMenu(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="md:hidden fixed left-4 z-50 space-y-2"
              style={{ bottom: 'max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem))' }}
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setActiveTab('claims'); setShowFabMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-border/50 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                  <Upload className="w-4 h-4 text-white" />
                </div>
                <span>Claim Penjualan</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setShowFabMenu(false) }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-border/50 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                  <ChevronUp className="w-4 h-4 text-white" />
                </div>
                <span>Scroll to Top</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFabMenu(false)}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-border/50 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-md">
                  <X className="w-4 h-4 text-white" />
                </div>
                <span>Tutup</span>
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ KEYBOARD SHORTCUTS DIALOG ═══ */}
      <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <DialogContent className="sm:max-w-md dialog-enhanced">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Keyboard className="w-4 h-4 text-white" />
              </div>
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>Perintah cepat untuk navigasi dan aksi</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2">
            {[
              { keys: ['Ctrl', 'K'], desc: 'Fokus pencarian', icon: <Search className="w-4 h-4" /> },
              { keys: ['/'], desc: 'Fokus pencarian', icon: <Search className="w-4 h-4" /> },
              { keys: ['Ctrl', 'U'], desc: 'Upload file Excel', icon: <Upload className="w-4 h-4" /> },
              { keys: ['1'], desc: 'Tab Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { keys: ['2'], desc: 'Tab Claim Penjualan', icon: <Upload className="w-4 h-4" /> },
              { keys: ['3'], desc: 'Tab Management', icon: <Settings className="w-4 h-4" /> },
              { keys: ['Ctrl', 'E'], desc: 'Export ke Excel', icon: <FileSpreadsheet className="w-4 h-4" /> },
              { keys: ['Esc'], desc: 'Tutup dialog/modal', icon: <X className="w-4 h-4" /> },
            ].map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="text-muted-foreground">{shortcut.icon}</div>
                  <span className="text-sm text-foreground">{shortcut.desc}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {shortcut.keys.map((key, ki) => (
                    <React.Fragment key={ki}>
                      {ki > 0 && <span className="text-[10px] text-muted-foreground">+</span>}
                      <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border border-border bg-muted/80 text-xs font-mono font-semibold text-foreground shadow-sm">
                        {key}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShortcutsDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ FLOATING CLAIM BAR ═══ */}
      <AnimatePresence>
        {selectedSaleIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed z-40 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:w-[440px]"
            style={{ bottom: 'max(60px, env(safe-area-inset-bottom, 60px))' }}
          >
            <div className="mx-3 mb-1 md:mx-0 md:mb-0 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-emerald-200 dark:border-emerald-800 shadow-2xl shadow-emerald-500/10 overflow-hidden">
              {/* Top row: info + close */}
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {selectedSaleIds.size} item dipilih
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{fmtRp(selectedItemsTotal)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSaleIds(new Set())}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                  title="Batal pilih"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview badges */}
              {selectedItemsPreview.length > 0 && (
                <div className="flex items-center gap-1 px-3 pb-2 overflow-hidden">
                  {selectedItemsPreview.map(s => (
                    <Badge key={s.id} variant="outline" className="text-[9px] px-1.5 py-0 h-5 font-mono shrink-0 bg-muted/50 border-border/50">
                      {s.kodeExtend.length > 8 ? s.kodeExtend.slice(0, 8) + '…' : s.kodeExtend}
                    </Badge>
                  ))}
                  {selectedSaleIds.size > 3 && (
                    <span className="text-[10px] text-muted-foreground shrink-0">+{selectedSaleIds.size - 3}</span>
                  )}
                </div>
              )}

              {/* Progress bar during bulk claim */}
              {bulkClaimProgress > 0 && (
                <div className="px-3 pb-2">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      initial={{ width: '0%' }}
                      animate={{ width: `${bulkClaimProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">
                    {bulkClaimProgress < 100 ? `Meng-claim ${selectedSaleIds.size} data...` : 'Selesai!'}
                  </p>
                </div>
              )}

              {/* Crew search or selected crew + claim button */}
              <div className="px-3 pb-3">
                {selectedClaimCrew && selectedClaimCrewId ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <Avatar className="w-5 h-5 shrink-0">
                        <AvatarImage src={selectedClaimCrew.photo || ''} />
                        <AvatarFallback className="text-[7px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                          {selectedClaimCrew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">{selectedClaimCrew.name}</span>
                      <button onClick={() => { setSelectedClaimCrewId(''); setClaimCrewSearch('') }} className="ml-auto text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <Button
                      onClick={() => setClaimConfirmDialog(true)}
                      disabled={claiming}
                      size="sm"
                      className="shrink-0 bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50 animate-pulse-glow h-9 px-4"
                    >
                      {claiming ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />OK</>
                      ) : (
                        <><UserCheck className="w-3.5 h-3.5 mr-1.5" />Claim</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Cari nama crew untuk claim..."
                          value={claimCrewSearch}
                          onChange={e => { setClaimCrewSearch(e.target.value); setSelectedClaimCrewId('') }}
                          className="pl-8 h-9 w-full text-xs rounded-xl"
                          autoFocus
                        />
                      </div>
                      <Button
                        onClick={() => setClaimConfirmDialog(true)}
                        disabled={true}
                        size="sm"
                        className="shrink-0 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed h-9 px-4"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" />Claim
                      </Button>
                    </div>
                    {/* Crew search dropdown */}
                    {!selectedClaimCrewId && claimCrewResults.length > 0 && (
                      <div className="absolute bottom-full left-0 right-8 mb-1 rounded-xl border bg-white dark:bg-gray-900 shadow-xl z-50 max-h-52 overflow-y-auto">
                        {claimCrewResults.map(c => (
                          <button
                            key={c.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                            onClick={() => { setClaimCrewSearch(c.name); setSelectedClaimCrewId(c.id) }}
                          >
                            <Avatar className="w-7 h-7 shrink-0">
                              <AvatarImage src={c.photo || ''} />
                              <AvatarFallback className="text-[8px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.employeeId} — {c.group?.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Anti double-claim indicator */}
                <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-muted-foreground">Anti double-claim aktif</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ SALES DETAIL MODAL ═══ */}
      <Dialog open={!!saleDetailDialog} onOpenChange={open => { if (!open) setSaleDetailDialog(null) }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto dialog-enhanced">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Info className="w-4 h-4 text-white" />
              </div>
              Detail Penjualan
            </DialogTitle>
            <DialogDescription>Informasi lengkap data penjualan</DialogDescription>
          </DialogHeader>
          {saleDetailDialog && (
            <div className="space-y-4">
              {/* Hero Section */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-extrabold tracking-tight text-foreground truncate">{saleDetailDialog.kodeExtend}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {saleDetailDialog.dept && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${getDeptColor(saleDetailDialog.dept)}`}>
                        {saleDetailDialog.dept}
                      </span>
                    )}
                    {saleDetailDialog.brand && (
                      <span className="tag-chip tag-chip-brand">{saleDetailDialog.brand}</span>
                    )}
                    {saleDetailDialog.modul && (
                      <span className="tag-chip">{saleDetailDialog.modul}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtRp(saleDetailDialog.settle)}</p>
                  <p className="text-xs text-muted-foreground">{saleDetailDialog.qty} qty</p>
                </div>
              </div>

              {/* Settlement Calculation Breakdown */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Kalkulasi Settle</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">HJP × Qty</span>
                    <span className="font-mono font-semibold">{fmtRp(saleDetailDialog.hjp)} × {saleDetailDialog.qty} = {fmtRp(saleDetailDialog.hjp * saleDetailDialog.qty)}</span>
                  </div>
                  {saleDetailDialog.diskon > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Diskon ({saleDetailDialog.diskon}%)</span>
                      <span className="font-mono text-red-500 dark:text-red-400">- {fmtRp(saleDetailDialog.diskonRp)}</span>
                    </div>
                  )}
                  {saleDetailDialog.potongan > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Potongan</span>
                      <span className="font-mono text-red-500 dark:text-red-400">- {fmtRp(saleDetailDialog.potongan)}</span>
                    </div>
                  )}
                  <div className="h-px bg-border/50 my-1" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-foreground">Settle</span>
                    <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{fmtRp(saleDetailDialog.settle)}</span>
                  </div>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="detail-grid">
                {[
                  { label: 'Tanggal', value: saleDetailDialog.tanggal || '-', icon: <Calendar className="w-3 h-3" /> },
                  { label: 'ID Penjualan', value: saleDetailDialog.idPenjualan || '-', icon: <Package className="w-3 h-3" /> },
                  { label: 'Brand', value: saleDetailDialog.brand || '-', icon: <Star className="w-3 h-3" /> },
                  { label: 'Dept', value: saleDetailDialog.dept || '-', icon: <Layers className="w-3 h-3" /> },
                  { label: 'Modul', value: saleDetailDialog.modul || '-', icon: <Layers className="w-3 h-3" /> },
                  { label: 'Ukuran', value: saleDetailDialog.ukuran || '-', icon: <Layers className="w-3 h-3" /> },
                  { label: 'Qty', value: String(saleDetailDialog.qty), icon: <Package className="w-3 h-3" /> },
                  { label: 'HJP', value: saleDetailDialog.hjp ? fmtRp(saleDetailDialog.hjp) : '-', icon: <DollarSign className="w-3 h-3" /> },
                  { label: 'Netto', value: saleDetailDialog.netto ? fmtRp(saleDetailDialog.netto) : '-', icon: <DollarSign className="w-3 h-3" /> },
                  { label: 'Diskon (%)', value: saleDetailDialog.diskon ? String(saleDetailDialog.diskon) : '-', icon: <Percent className="w-3 h-3" /> },
                  { label: 'Diskon (Rp)', value: saleDetailDialog.diskonRp ? fmtRp(saleDetailDialog.diskonRp) : '-', icon: <DollarSign className="w-3 h-3" /> },
                  { label: 'Potongan', value: saleDetailDialog.potongan ? fmtRp(saleDetailDialog.potongan) : '-', icon: <DollarSign className="w-3 h-3" /> },
                  { label: 'Potongan V', value: saleDetailDialog.potonganV ? String(saleDetailDialog.potonganV) : '-', icon: <Percent className="w-3 h-3" /> },
                  { label: 'Pembayaran', value: saleDetailDialog.pembayaran || '-', icon: getPaymentIcon(saleDetailDialog.pembayaran) || <Wallet className="w-3 h-3" /> },
                  { label: 'Program', value: saleDetailDialog.program || '-', icon: <Star className="w-3 h-3" /> },
                  { label: 'Channel Stock', value: saleDetailDialog.channelStock || '-', icon: <Layers className="w-3 h-3" /> },
                  { label: 'Status Ret.', value: saleDetailDialog.statusRetention || '-', icon: <AlertCircle className="w-3 h-3" /> },
                  { label: 'Ret. Code', value: saleDetailDialog.retentionCode || '-', icon: <Code2 className="w-3 h-3" /> },
                ].map((item, i) => (
                  <div key={i} className="detail-cell">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                      {item.icon}
                      <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Crew Info / Claim History */}
              {saleDetailDialog.crew ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                  <Avatar className="w-10 h-10 ring-2 ring-emerald-200 dark:ring-emerald-800">
                    <AvatarImage src={saleDetailDialog.crew.photo || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-sm">
                      {saleDetailDialog.crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{saleDetailDialog.crew.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{saleDetailDialog.crew.employeeId}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Claimed</span>
                    </div>
                    {saleDetailDialog.claimedAt && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {saleDetailDialog.claimedAt && new Date(saleDetailDialog.claimedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Search className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Belum di-claim</p>
                    <p className="text-[11px] text-muted-foreground">Data belum ditugaskan ke crew</p>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-center pt-2 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground font-mono">
                  Created: {new Date(saleDetailDialog.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleDetailDialog(null)}>Tutup</Button>
            {saleDetailDialog && isAdmin && (
              <div className="flex gap-2">
                {saleDetailDialog.crew && (
                  <Button size="sm" variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/30" onClick={() => { handleUnclaimSale(saleDetailDialog.id); setSaleDetailDialog(null) }}>
                    <X className="w-3 h-3 mr-1" />Unclaim
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30" onClick={() => { openEditSale(saleDetailDialog); setSaleDetailDialog(null) }}>
                  <Edit2 className="w-3 h-3 mr-1" />Edit
                </Button>
                <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30" onClick={() => { setDeleteConfirm({ type: 'sale', id: saleDetailDialog.id, name: `${saleDetailDialog.kodeExtend}${saleDetailDialog.crew ? ` — ${saleDetailDialog.crew.name}` : ' (unclaimed)'}` }); setSaleDetailDialog(null) }}>
                  <Trash2 className="w-3 h-3 mr-1" />Hapus
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ CLAIM CONFIRMATION DIALOG ═══ */}
      <Dialog open={claimConfirmDialog} onOpenChange={setClaimConfirmDialog}>
        <DialogContent className="sm:max-w-md dialog-enhanced">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
              Konfirmasi Claim
            </DialogTitle>
            <DialogDescription>Verifikasi data sebelum menugaskan ke crew</DialogDescription>
          </DialogHeader>
          {selectedClaimCrew && (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/50 dark:border-emerald-800/30 space-y-3">
                {/* Items count and total */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Item</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">{selectedSaleIds.size}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium">Total Settle</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtRp(selectedItemsTotal)}</p>
                  </div>
                </div>

                <Separator />

                {/* Selected items preview */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Item yang akan di-claim</p>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                    {selectedItemsPreview.map(s => (
                      <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-border/50">
                        {s.dept && <div className={`w-2 h-2 rounded-full shrink-0 ${getDeptColor(s.dept)}`} />}
                        <span className="text-[11px] font-mono font-medium text-foreground flex-1 truncate">{s.kodeExtend}</span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">{fmtRp(s.settle)}</span>
                      </div>
                    ))}
                    {selectedSaleIds.size > 3 && (
                      <p className="text-[10px] text-center text-muted-foreground py-1">+{selectedSaleIds.size - 3} item lainnya</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Crew info */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 ring-2 ring-emerald-200 dark:ring-emerald-800">
                    <AvatarImage src={selectedClaimCrew.photo || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-xs">
                      {selectedClaimCrew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Ditugaskan ke</p>
                    <p className="text-sm font-bold text-foreground truncate">{selectedClaimCrew.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{selectedClaimCrew.employeeId}</p>
                  </div>
                  <UserCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClaimConfirmDialog(false)} disabled={claiming}>Batal</Button>
            <Button
              onClick={() => { setClaimConfirmDialog(false); handleClaimSales(0) }}
              disabled={claiming}
              className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/25"
            >
              {claiming ? (
                <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Memproses...</>
              ) : (
                <><UserCheck className="w-3.5 h-3.5 mr-1.5" />Konfirmasi Claim</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ MOBILE ACCOUNT SHEET ═══ */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl overflow-hidden max-h-[80dvh]"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Profile header */}
              <div className="px-5 pb-4 pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-200 dark:ring-emerald-800">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-foreground">Administrator</p>
                    <p className="text-xs text-muted-foreground">admin@cms.local</p>
                  </div>
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] px-2 py-0.5 shrink-0">
                    <Shield className="w-3 h-3 mr-1" />Admin
                  </Badge>
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* Menu items */}
              <div className="px-3 py-3 space-y-1">
                <button
                  onClick={() => { setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'); setShowMobileMenu(false) }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-foreground hover:bg-muted/80 active:bg-muted transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                    {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
                  </div>
                  <span>{resolvedTheme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
                </button>
                <button
                  onClick={() => { setShowShortcutsDialog(true); setShowMobileMenu(false) }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-foreground hover:bg-muted/80 active:bg-muted transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                    <Keyboard className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span>Keyboard Shortcuts</span>
                </button>
              </div>

              <div className="border-t border-border/40 mx-3" />

              {/* Logout */}
              <div className="px-3 py-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
                <button
                  onClick={() => { handleLogout(); setShowMobileMenu(false) }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100 dark:active:bg-red-950/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MOBILE BOTTOM NAVIGATION ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] animate-mobile-nav-slide-up">
        <div className="flex items-center justify-around px-1 py-1.5" style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}>
          {navItems.map(t => {
            const isActive = activeTab === t.val
            return (
              <button
                key={t.val}
                onClick={() => { setShowMobileMenu(false); setActiveTab(t.val); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-2 sm:px-3 py-1.5 rounded-2xl min-w-[56px] sm:min-w-[64px] transition-all duration-200 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomnav-active"
                    className="absolute inset-0 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-200 ${isActive ? 'bg-emerald-100 dark:bg-emerald-900/60' : ''}`}
                  >
                    <t.icon className={`w-[18px] h-[18px] transition-all duration-200 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                  </motion.div>
                  <span className={`text-[10px] font-semibold leading-none transition-all duration-200 ${isActive ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                    {t.val === 'claims' ? 'Claim' : t.val === 'management' ? 'Mgmt' : t.label}
                  </span>
                  {isActive && <div className="mobile-nav-dot" />}
                </div>
              </button>
            )
          })}
          {/* Account / Logout button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="relative flex flex-col items-center justify-center gap-0.5 px-2 sm:px-3 py-1.5 rounded-2xl min-w-[56px] sm:min-w-[64px] transition-all duration-200 text-muted-foreground"
          >
            {showMobileMenu && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 rounded-2xl bg-muted/60"
              />
            )}
            <div className="relative z-10 flex flex-col items-center gap-0.5">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-200"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <span className="text-[11px] font-bold text-white">A</span>
                </div>
              </motion.div>
              <span className="text-[10px] font-semibold leading-none">Akun</span>
            </div>
          </button>
        </div>
      </nav>

      </div>
      </div>
  )
}

// ─── Crew Form Component ─────────────────────────────────
function CrewForm({ crew, groups, onSave, onCancel }: {
  crew?: Crew; groups: Group[]
  onSave: (data: { name: string; photo: string; employeeId: string; groupId: string }) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: crew?.name || '',
    photo: crew?.photo || '',
    employeeId: crew?.employeeId || '',
    groupId: crew?.groupId || crew?.group?.id || '',
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{crew ? 'Edit Crew' : 'Tambah Crew Baru'}</DialogTitle>
        <DialogDescription>Isi data crew yang akan ditambahkan</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label>Nama</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" /></div>
        <div className="space-y-2"><Label>Foto (URL)</Label><Input value={form.photo} onChange={e => setForm({ ...form, photo: e.target.value })} placeholder="https://..." /></div>
        <div className="space-y-2"><Label>ID Karyawan</Label><Input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} placeholder="EMP001" /></div>
        <div className="space-y-2">
          <Label>Group / Zoning</Label>
          <Select value={form.groupId} onValueChange={v => setForm({ ...form, groupId: v })}>
            <SelectTrigger><SelectValue placeholder="Pilih group..." /></SelectTrigger>
            <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || !form.employeeId || !form.groupId} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {crew ? 'Simpan Perubahan' : 'Tambah Crew'}
        </Button>
      </DialogFooter>
    </>
  )
}

// ─── Group Form Component ────────────────────────────────
function GroupForm({ group, onSave, onCancel }: {
  group?: Group
  onSave: (data: { name: string; logo: string; monthlyTarget: number; week1Target: number; week2Target: number; week3Target: number; week4Target: number }) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: group?.name || '',
    logo: group?.logo || '',
    monthlyTarget: group?.monthlyTarget?.toString() || '',
    week1Target: group?.week1Target?.toString() || '20',
    week2Target: group?.week2Target?.toString() || '25',
    week3Target: group?.week3Target?.toString() || '25',
    week4Target: group?.week4Target?.toString() || '30',
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{group ? 'Edit Group' : 'Tambah Group Baru'}</DialogTitle>
        <DialogDescription>Atur target penjualan mingguan dan bulanan</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label>Nama Group</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Zone A - Premium" /></div>
        <div className="space-y-2"><Label>Logo (URL)</Label><Input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="https://..." /></div>
        <div className="space-y-2"><Label>Target Bulanan (Rp)</Label><Input type="number" value={form.monthlyTarget} onChange={e => setForm({ ...form, monthlyTarget: e.target.value })} placeholder="50000000" /></div>
        <Separator />
        <p className="text-sm font-medium">Target Mingguan (%)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['week1Target', 'week2Target', 'week3Target', 'week4Target'].map((key, i) => (
            <div key={key} className="space-y-1 text-center">
              <Label className="text-[10px]">W{i + 1} ({(i * 7 + 1)}–{Math.min((i + 1) * 7, 31)})</Label>
              <Input type="number" value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="text-center h-9" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Total: {Number(form.week1Target || 0) + Number(form.week2Target || 0) + Number(form.week3Target || 0) + Number(form.week4Target || 0)}%</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button onClick={() => onSave({
          name: form.name,
          logo: form.logo,
          monthlyTarget: Number(form.monthlyTarget) || 0,
          week1Target: Number(form.week1Target) || 0,
          week2Target: Number(form.week2Target) || 0,
          week3Target: Number(form.week3Target) || 0,
          week4Target: Number(form.week4Target) || 0,
        })} disabled={!form.name} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {group ? 'Simpan Perubahan' : 'Tambah Group'}
        </Button>
      </DialogFooter>
    </>
  )
}
