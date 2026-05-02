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
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  LayoutDashboard, Upload, Settings, Trophy, Medal, Target, TrendingUp,
  Users, Crown, Star, Zap, ArrowUpRight, ArrowDownRight, Plus, Trash2,
  Edit2, LogOut, Search, FileSpreadsheet, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, DollarSign, ShoppingCart, BarChart3,
  Calendar, Award, Flame, CircleDot, Package, Clock, Shield,
  Sun, Moon, AlertTriangle, UploadCloud, X, Download, Filter, Sparkles, Eye, RefreshCw, Percent, ChevronUp, UserCheck,
  Menu, Layers, Monitor, Tablet, Smartphone, Code2, Beaker, Briefcase, Heart
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────
interface CrewStat {
  id: string; name: string; photo: string | null; employeeId: string
  groupId: string; groupName: string; groupLogo: string | null
  todayTotal: number; todayQty: number; weekTotal: number; weekQty: number
  monthTotal: number; monthQty: number; allTimeTotal: number; allTimeQty: number
  transactionCount: number
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
  createdAt: string; claimedAt: string | null
  crew: { id: string; name: string; employeeId: string; photo: string | null } | null
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

// ─── Animated Counter ────────────────────────────────────
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const isNeg = value < 0
    let start = 0
    const end = Math.abs(value)
    const duration = 1200
    const stepTime = 16
    const steps = duration / stepTime
    const increment = end / steps
    const timer = setInterval(() => {
      start += increment
      if (start >= end) { setDisplay(isNeg ? -end : end); clearInterval(timer) }
      else setDisplay(Math.floor(start) * (isNeg ? -1 : 1))
    }, stepTime)
    return () => clearInterval(timer)
  }, [value])
  return <span>{prefix}{fmtNum(Math.abs(display))}{suffix}</span>
}

// ─── Skeleton Loader ────────────────────────────────────
function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-muted rounded-full w-full" style={{ maxWidth: i === 0 ? '80px' : '120px' }} />
        </td>
      ))}
    </tr>
  )
}

function SkeletonCard() {
  return (
    <div className="p-3 rounded-lg border bg-white dark:bg-gray-900 animate-pulse">
      <div className="h-3 bg-muted rounded-full w-3/4 mb-2" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-2.5 bg-muted rounded-full w-12" />
        <div className="h-2.5 bg-muted rounded-full w-20" />
        <div className="h-2.5 bg-muted rounded-full w-12" />
        <div className="h-2.5 bg-muted rounded-full w-16" />
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
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${color} ${shimmer}`}>{icon}{label}</span>
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
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'crew' | 'group' | 'sale' | 'batch-sale'; ids?: string[]; id?: string; name: string } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  // Dashboard state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashPeriod, setDashPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [dashLoading, setDashLoading] = useState(true)

  // Claims state
  const [crews, setCrews] = useState<Crew[]>([])
  const [claimSales, setClaimSales] = useState<ClaimSale[]>([])
  const [claimTotal, setClaimTotal] = useState(0)
  const [claimTotalPages, setClaimTotalPages] = useState(1)
  const [claimPage, setClaimPage] = useState(1)
  const [claimSearch, setClaimSearch] = useState('')
  const [claimDateFrom, setClaimDateFrom] = useState('')
  const [claimDateTo, setClaimDateTo] = useState('')
  const [claimFilterProgram, setClaimFilterProgram] = useState('')
  const [claimFilterCrew, setClaimFilterCrew] = useState('')
  const [claimShowClaimed, setClaimShowClaimed] = useState<'unclaimed' | 'claimed' | 'all'>('unclaimed')
  const [claimsLoading, setClaimsLoading] = useState(false)
  const [claimSortField, setClaimSortField] = useState<string>('createdAt')
  const [claimSortDir, setClaimSortDir] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<{ totalRows: number; totalQty: number; totalSettle: number; uniqueProducts: number; duplicateRows?: number } | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [programs, setPrograms] = useState<string[]>([])
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set())
  const [claimCrewSearch, setClaimCrewSearch] = useState('')
  const [claimSummary, setClaimSummary] = useState<{ totalQty: number; totalSettle: number; totalStruk: number; basketSize: number; pricePoint: number } | null>(null)
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
      const r = await fetch(`/api/dashboard?period=${dashPeriod}`)
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      setDashboard(d)
    } catch { toast.error('Gagal memuat dashboard') }
    finally { setDashLoading(false) }
  }, [dashPeriod])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // Fetch crews for claim form
  useEffect(() => {
    fetch('/api/crews').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setCrews(d)
    }).catch(() => {})
  }, [])

  // Fetch claim sales history
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
      const r = await fetch(`/api/claims?${params}`)
      const d = await r.json()
      setClaimSales(d.sales || [])
      setClaimTotal(d.total || 0)
      setClaimTotalPages(d.totalPages || 1)
      setClaimPage(d.page || 1)
      if (d.summary) setClaimSummary(d.summary)
    } catch { /* silent */ }
    finally { setClaimsLoading(false) }
  }, [claimSearch, claimDateFrom, claimDateTo, claimFilterProgram, claimFilterCrew, claimShowClaimed])

  useEffect(() => { fetchClaims(1) }, [fetchClaims])

  // Fetch programs for filter dropdown
  const fetchPrograms = useCallback(async () => {
    try {
      const r = await fetch('/api/claims/programs')
      const d = await r.json()
      if (d.programs && Array.isArray(d.programs)) setPrograms(d.programs)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

  // Fetch management data
  const fetchManagement = useCallback(async () => {
    try {
      const [g, c] = await Promise.all([fetch('/api/groups').then(r => r.json()), fetch('/api/crews').then(r => r.json())])
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

  // ─── Auth handlers ────────────────────────────────────
  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { toast.error('Isi username dan password'); return }
    try {
      const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm) })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      setIsAdmin(true)
      toast.success(`Selamat datang, ${d.admin.name}!`)
    } catch { toast.error('Login gagal') }
  }

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
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
      const r = await fetch('/api/claims', { method: 'POST', body: fd })
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processImport(file)
    e.target.value = ''
  }

  const handleDropFile = async (file: File) => {
    if (!file) return
    await processImport(file)
  }

  const handleClaimSales = async (retryCount = 0) => {
    if (selectedSaleIds.size === 0) return
    if (!claimCrewSearch) { toast.error('Cari dan pilih crew terlebih dahulu'); return }
    const crew = crews.find(c => c.id === claimCrewSearch)
    if (!crew) { toast.error('Crew tidak ditemukan'); return }
    setClaiming(true)
    try {
      const r = await fetch('/api/claims', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleIds: Array.from(selectedSaleIds), crewId: crew.id })
      })
      const d = await r.json()

      // ── Handle conflict responses (race condition detected) ──
      if (d.code === 'ALL_CONFLICT') {
        // ALL requested sales were already claimed by someone else
        const claimers = [...new Set((d.conflictDetails || []).map((c: { claimedBy: string }) => c.claimedBy))]
        toast.error(`⚠️ Semua data sudah di-claim oleh ${claimers.join(', ')}! Data mungkin sudah diambil oleh device lain.`, { duration: 8000 })
        setSelectedSaleIds(new Set())
        setClaimCrewSearch('')
        fetchClaims(claimPage)
        return
      }

      if (d.code === 'PARTIAL_CONFLICT') {
        // Some sales claimed successfully, some conflicted
        const claimers = [...new Set((d.conflictDetails || []).map((c: { claimedBy: string }) => c.claimedBy))]
        toast.warning(
          `⚡ ${d.claimedCount} berhasil, ${d.conflictCount} sudah di-claim ${claimers.join(', ')} — kemungkinan claim bersamaan dari device lain`,
          { duration: 8000 }
        )
        setSelectedSaleIds(new Set())
        setClaimCrewSearch('')
        fetchClaims(claimPage)
        fetchDashboard()
        return
      }

      if (d.error) {
        // Network error or server error — retry with exponential backoff (max 2 retries)
        if (retryCount < 2 && !r.ok) {
          const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s
          toast.info(`⏳ Retry ${retryCount + 1} setelah ${delay / 1000}s... (jaringan lambat)`, { duration: delay })
          setClaiming(false)
          await new Promise(resolve => setTimeout(resolve, delay))
          return handleClaimSales(retryCount + 1)
        }
        toast.error(d.error)
        return
      }

      // Full success
      toast.success(`✅ ${d.claimedCount || 0} data berhasil di-claim ke ${crew.name} (${fmtRp(d.totalSettle || 0)})`)
      setSelectedSaleIds(new Set())
      setClaimCrewSearch('')
      fetchClaims(claimPage)
      fetchDashboard()
    } catch {
      // Network failure — retry once
      if (retryCount < 1) {
        toast.info('⏳ Koneksi gagal, mencoba lagi...')
        setClaiming(false)
        await new Promise(resolve => setTimeout(resolve, 1500))
        return handleClaimSales(retryCount + 1)
      }
      toast.error('❌ Gagal meng-claim data. Periksa koneksi internet dan coba lagi.')
    } finally { setClaiming(false) }
  }

  const handleUnclaimSale = async (saleId: string) => {
    try {
      const r = await fetch('/api/claims/unclaim', {
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
      const r = await fetch('/api/groups', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
                  <div className="hidden xs:block">
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                    {mounted ? (
                      <motion.span key={resolvedTheme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.2 }}>
                        {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </motion.span>
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </Button>
                  {isAdmin && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="hidden sm:flex items-center gap-1.5">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 text-[10px] px-2 py-0.5">
                        <Shield className="w-3 h-3 mr-1" /> Admin
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="Logout">
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )}
                  {/* Mobile hamburger */}
                  <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-xl" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    <motion.span key={mobileMenuOpen ? 'open' : 'closed'} initial={false} animate={{ rotate: mobileMenuOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </motion.span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile slide-down menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="md:hidden overflow-hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl border-b border-border/50"
              >
                <div className="max-w-7xl mx-auto px-3 py-3 space-y-1">
                  {/* Mobile: CMS Crew label for xs screens */}
                  <div className="xs:hidden flex items-center gap-2 px-3 pb-2 mb-2 border-b border-border/50">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center">
                      <Layers className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">CMS Crew</p>
                      <p className="text-[9px] text-muted-foreground">Ahtjong Labs · {dateStr}</p>
                    </div>
                  </div>
                  {navItems.map(t => (
                    <button
                      key={t.val}
                      onClick={() => { setActiveTab(t.val); setMobileMenuOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        activeTab === t.val
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === t.val ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-muted/60'}`}>
                        <t.icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold">{t.label}</p>
                        <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                  {isAdmin && (
                    <div className="pt-2 mt-2 border-t border-border/50 flex items-center justify-between px-3">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 text-[10px]">
                        <Shield className="w-3 h-3 mr-1" /> Admin
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs h-8">
                        <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
            <TabsContent value="dashboard" className="mt-4 sm:mt-6 pb-8">
              {dashLoading ? (
                <div className="space-y-6 animate-pulse">
                  {/* Skeleton Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-4 sm:p-6 rounded-xl border bg-white dark:bg-gray-900">
                        <div className="h-3 bg-muted rounded-full w-3/4 mb-3" />
                        <div className="h-7 bg-muted rounded-full w-2/3 mb-2" />
                        <div className="h-2.5 bg-muted rounded-full w-1/2" />
                      </div>
                    ))}
                  </div>
                  {/* Skeleton Podium */}
                  <div className="p-6 rounded-xl border bg-white dark:bg-gray-900">
                    <div className="h-4 bg-muted rounded-full w-40 mb-6" />
                    <div className="flex items-end justify-center gap-3 sm:gap-6 pb-4">
                      {['h-28 sm:h-36', 'h-36 sm:h-48', 'h-24 sm:h-32'].map((h, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted mb-2" />
                          <div className="h-3 bg-muted rounded-full w-16 mb-2" />
                          <div className={`w-20 sm:w-28 ${h} rounded-t-xl bg-muted`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Skeleton Table Rows */}
                  <div className="p-6 rounded-xl border bg-white dark:bg-gray-900 space-y-3">
                    <div className="h-4 bg-muted rounded-full w-48 mb-4" />
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
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { label: 'Penjualan Hari Ini', value: dashboard.totals.today, qty: dashboard.totals.todayQty, icon: Zap, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', trend: dashboard.trends?.today },
                      { label: 'Penjualan Minggu Ini', value: dashboard.totals.week, qty: dashboard.totals.weekQty, icon: TrendingUp, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', trend: dashboard.trends?.week },
                      { label: 'Penjualan Bulan Ini', value: dashboard.totals.month, qty: dashboard.totals.monthQty, icon: BarChart3, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', trend: dashboard.trends?.month },
                      { label: 'Total Transaksi', value: dashboard.crewStats.reduce((s, c) => s + c.transactionCount, 0), qty: 0, icon: ShoppingCart, gradient: 'from-cyan-500 to-sky-600', shadow: 'shadow-cyan-500/20', trend: null },
                    ].map((card, i) => (
                      <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }} whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300 } }}>
                        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-default card-hover-glow">
                          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-300`} />
                          <CardContent className="p-4 sm:p-6 relative">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                                  {card.trend && card.trend.changePercent !== null && card.trend.direction !== 'same' && (
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
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} ${card.shadow} shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                <card.icon className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {/* Top Crew Leaderboard */}
                  <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
                    <Card className="border-0 shadow-lg overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <CardTitle className="text-base bg-gradient-to-r from-amber-600 to-emerald-600 dark:from-amber-400 dark:to-emerald-400 bg-clip-text text-transparent">Top Crew Leaderboard</CardTitle>
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
                          <div className="flex items-end justify-center gap-3 sm:gap-6 pb-4">
                            {[1, 0, 2].map((rank) => {
                              const crew = dashboard.topCrews[rank]
                              if (!crew) return null
                              const periodVal = dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
                              const isFirst = rank === 0
                              const heights = ['h-28 sm:h-36', 'h-36 sm:h-48', 'h-24 sm:h-32']
                              const medals = [
                                <span key="1" className="text-2xl sm:text-3xl">🥇</span>,
                                <span key="0" className="text-3xl sm:text-4xl">👑</span>,
                                <span key="2" className="text-2xl sm:text-3xl">🥉</span>,
                              ]
                              const colors = [
                                'from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800',
                                'from-amber-300 to-amber-500 dark:from-amber-600 dark:to-amber-800',
                                'from-orange-200 to-orange-400 dark:from-orange-700 dark:to-orange-900',
                              ]
                              return (
                                <motion.div key={crew.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.15, type: 'spring', stiffness: 200 }}
                                  className="flex flex-col items-center">
                                  <Avatar className={`w-12 h-12 sm:w-16 sm:h-16 border-2 border-white dark:border-gray-700 shadow-md ${isFirst ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
                                    <AvatarImage src={crew.photo || ''} />
                                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-sm">
                                      {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <p className="mt-1.5 text-xs sm:text-sm font-semibold text-center max-w-[100px] truncate">{crew.name}</p>
                                  <p className="text-xs text-muted-foreground">{crew.groupName}</p>
                                  <div className={`w-20 sm:w-28 ${heights[rank]} mt-2 rounded-t-xl bg-gradient-to-t ${colors[rank]} flex flex-col items-center justify-end pb-3 shadow-lg`}>
                                    {medals[rank]}
                                    <p className="text-[10px] sm:text-xs font-bold mt-1">{fmtRp(periodVal)}</p>
                                  </div>
                                  <Badge variant="outline" className="mt-1 text-[10px]">#{rank + 1}</Badge>
                                </motion.div>
                              )
                            })}
                          </div>
                        )}

                        {/* Full Ranking Table */}
                        {dashboard.crewStats.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            {/* Mobile Card View */}
                            <div className="md:hidden max-h-64 overflow-y-auto space-y-2">
                              {dashboard.crewStats.map((crew, idx) => {
                                const periodVal = dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
                                const periodQty = dashPeriod === 'today' ? crew.todayQty : dashPeriod === 'week' ? crew.weekQty : crew.monthQty
                                return (
                                  <div key={crew.id} className={`p-3 rounded-lg border ${idx < 3 ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30' : 'bg-white dark:bg-gray-900'}`}>
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-sm font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>
                                      <Avatar className="w-8 h-8">
                                        <AvatarImage src={crew.photo || ''} />
                                        <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                                          {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{crew.name}</p>
                                        <p className="text-[11px] text-muted-foreground">{crew.groupName} • Qty: {fmtNum(periodQty)}</p>
                                      </div>
                                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{fmtRp(periodVal)}</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            {/* Desktop Table View */}
                            <div className="hidden md:block max-h-64 overflow-y-auto">
                              <Table className="table-stripe table-sticky-head">
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10">#</TableHead>
                                    <TableHead>Crew</TableHead>
                                    <TableHead>Group</TableHead>
                                    <TableHead className="text-right">Penjualan</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {dashboard.crewStats.map((crew, idx) => {
                                    const periodVal = dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
                                    const periodQty = dashPeriod === 'today' ? crew.todayQty : dashPeriod === 'week' ? crew.weekQty : crew.monthQty
                                    return (
                                      <TableRow key={crew.id} className={idx < 3 ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                                        <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Avatar className="w-8 h-8">
                                              <AvatarImage src={crew.photo || ''} />
                                              <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                                                {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <p className="font-medium text-sm cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" onClick={() => setSelectedCrewDetail(crew)}>{crew.name}</p>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="text-xs">{crew.groupName}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{fmtRp(periodVal)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{fmtNum(periodQty)}</TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Group Achievement Cards */}
                  <motion.div {...fadeIn} transition={{ delay: 0.4 }}>
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
                          <p className="text-center py-8 text-muted-foreground text-sm">Belum ada group</p>
                        ) : (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dashboard.groupAchievements.map((g) => (
                              <motion.div key={g.id} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }}>
                                <Card className="border-0 shadow-md bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-800/80 overflow-hidden">
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
                  <motion.div {...fadeIn} transition={{ delay: 0.5 }}>
                    <Card className="border-0 shadow-lg overflow-hidden">
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
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} />
                                <Tooltip formatter={(value: number) => fmtRp(value)} labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.922 0 0)', fontSize: 12 }} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                  {dashboard.crewStats.map((_, idx) => (
                                    <Cell key={idx} fill={idx === 0 ? '#059669' : idx === 1 ? '#d97706' : idx === 2 ? '#8b5cf6' : idx === 3 ? '#0891b2' : '#6b7280'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <p className="text-center py-8 text-muted-foreground text-sm">Belum ada data</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Sales Trend Line Chart */}
                  <motion.div {...fadeIn} transition={{ delay: 0.55 }}>
                    <Card className="border-0 shadow-lg overflow-hidden">
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
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} />
                                <Tooltip formatter={(value: number) => fmtRp(value)} labelStyle={{ fontWeight: 600 }} contentStyle={{ borderRadius: 12, border: '1px solid oklch(0.922 0 0)', fontSize: 12 }} />
                                <Line type="monotone" dataKey="today" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }} activeDot={{ r: 6 }} name="Hari Ini" />
                                <Line type="monotone" dataKey="week" stroke="#d97706" strokeWidth={2} dot={{ r: 3, fill: '#d97706' }} name="Minggu Ini" strokeDasharray="5 5" />
                                <Line type="monotone" dataKey="month" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} name="Bulan Ini" strokeDasharray="2 4" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <p className="text-center py-8 text-muted-foreground text-sm">Belum ada data</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Recent Activity */}
                  <motion.div {...fadeIn} transition={{ delay: 0.6 }}>
                    <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-emerald-500" />
                          <CardTitle className="text-base bg-gradient-to-r from-emerald-600 to-cyan-600 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent">Aktivitas Terbaru</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {dashboard.recentSales.length === 0 ? (
                          <div className="text-center py-8">
                            <motion.div
                              animate={{ y: [0, -6, 0] }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                              className="inline-block"
                            >
                              <Clock className="w-10 h-10 mx-auto mb-2 text-muted-foreground/20" />
                            </motion.div>
                            <p className="text-sm text-muted-foreground">Belum ada aktivitas terbaru</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dashboard.recentSales.map((sale, i) => (
                              <motion.div key={sale.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={sale.crew.photo || ''} />
                                  <AvatarFallback className="text-xs">{sale.crew.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{sale.crew.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{sale.kodeExtend} • {sale.tanggal}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtRp(sale.settle)}</p>
                                  <p className="text-xs text-muted-foreground">Qty: {sale.qty}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ) : null}
            </TabsContent>

            {/* ─── Claims Tab ───────────────────────────── */}
            <TabsContent value="claims" className="mt-4 sm:mt-6 pb-8">
              <motion.div {...stagger} className="space-y-6">
                {/* Upload Modal Dialog */}
                <Dialog open={showUploadModal} onOpenChange={open => { setShowUploadModal(open); if (!open) { setUploadResult(null); setIsDragOver(false) } }}>
                  <DialogContent className="sm:max-w-lg">
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
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
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
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowUploadModal(false)}>Tutup</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Section 2: Summary Cards — Total Settle, Qty, Basket Size, Price Point */}
                {claimSummary && claimTotal > 0 && !claimsLoading && (
                  <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Settle', value: fmtRp(claimSummary.totalSettle), icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', sub: `${fmtNum(claimTotal)} data` },
                        { label: 'Total Qty', value: fmtNum(claimSummary.totalQty), icon: Package, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', sub: 'jumlah item' },
                        { label: 'Basket Size', value: claimSummary.basketSize.toFixed(2), icon: ShoppingCart, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', sub: `${fmtNum(claimSummary.totalStruk)} struk` },
                        { label: 'Price Point', value: fmtRp(claimSummary.pricePoint), icon: Percent, gradient: 'from-cyan-500 to-sky-600', shadow: 'shadow-cyan-500/20', sub: 'rata-rata HJP' },
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

                {/* Section 3: Claim Action Bar (shows when sales are selected) */}
                <AnimatePresence>
                  {selectedSaleIds.size > 0 && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                      <Card className="border-2 border-emerald-300 dark:border-emerald-700 shadow-lg shadow-emerald-500/10 overflow-hidden">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 shrink-0">
                              <CheckCircle2 className="w-3 h-3 mr-1" />{selectedSaleIds.size} item terpilih
                            </Badge>
                            <div className="relative flex-1 w-full sm:max-w-xs">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Cari nama crew..."
                                value={claimCrewSearch}
                                onChange={e => setClaimCrewSearch(e.target.value)}
                                className="pl-9 h-9 w-full"
                              />
                              {claimCrewResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-white dark:bg-gray-900 shadow-lg z-50 max-h-48 overflow-y-auto">
                                  {claimCrewResults.map(c => (
                                    <button
                                      key={c.id}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                                      onClick={() => setClaimCrewSearch(c.id)}
                                    >
                                      <Avatar className="w-6 h-6">
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
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Button
                                onClick={() => handleClaimSales(0)}
                                disabled={claiming || !crews.find(c => c.id === claimCrewSearch)}
                                className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {claiming ? (
                                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Claiming...</>
                                ) : (
                                  <><UserCheck className="w-4 h-4 mr-2" />Claim ({selectedSaleIds.size})</>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => setSelectedSaleIds(new Set())}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Batal pilih"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            {/* Real-time claim lock indicator */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Anti double-claim aktif — hanya 1 device yang bisa claim per data</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Section 4: Laporan Penjualan Table */}
                <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
                  <Card className="border-0 shadow-lg card-hover-glow">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3">
                        {/* Header row */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-emerald-500" />
                            <CardTitle className="text-base">Laporan Penjualan</CardTitle>
                            <Badge variant="outline" className="text-xs">{fmtNum(claimTotal)} data</Badge>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20" onClick={() => setShowUploadModal(true)}>
                              <UploadCloud className="w-3.5 h-3.5" /> Upload
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowFilters(!showFilters)}>
                              <Filter className="w-3.5 h-3.5" /> Filter
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30" onClick={handleExport}>
                              <Download className="w-3.5 h-3.5" /> Export CSV
                            </Button>
                            {isAdmin && batchSelectedIds.size > 0 && (
                              <Button variant="destructive" size="sm" className="h-8 gap-1.5" onClick={() => setDeleteConfirm({ type: 'batch-sale', ids: Array.from(batchSelectedIds), name: `${batchSelectedIds.size} data terpilih` })}>
                                <Trash2 className="w-3.5 h-3.5" /> Hapus ({batchSelectedIds.size})
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

                        {/* Search + Filters row */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1 sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Cari kode, brand, dept, crew..." value={claimSearch} onChange={e => { setClaimSearch(e.target.value) }}
                              className="pl-9 h-9 w-full" />
                          </div>
                          <Select value={claimFilterProgram || '__all__'} onValueChange={v => { setClaimFilterProgram(v === '__all__' ? '' : v) }}>
                            <SelectTrigger className="h-9 w-full sm:w-40 text-xs">
                              <Sparkles className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
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
                            <SelectTrigger className="h-9 w-full sm:w-48 text-xs">
                              <Users className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                              <SelectValue placeholder="Semua Crew" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Semua Crew</SelectItem>
                              {crews.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Expandable date filters */}
                        <AnimatePresence>
                          {showFilters && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                  <Input type="date" value={claimDateFrom} onChange={e => setClaimDateFrom(e.target.value)} className="h-8 w-[140px] text-xs" />
                                  <span className="text-xs text-muted-foreground">s/d</span>
                                  <Input type="date" value={claimDateTo} onChange={e => setClaimDateTo(e.target.value)} className="h-8 w-[140px] text-xs" />
                                </div>
                                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setClaimDateFrom(''); setClaimDateTo('') }}>
                                  Reset
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {claimsLoading ? (
                        <div className="space-y-3 animate-pulse">
                          <div className="md:hidden space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                          </div>
                          <div className="hidden md:block">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent bg-muted/50">
                                  <TableHead className="text-xs">Tanggal</TableHead>
                                  <TableHead className="text-xs">Kode Extend</TableHead>
                                  <TableHead className="text-xs">Dept</TableHead>
                                  <TableHead className="text-xs text-right">Qty</TableHead>
                                  <TableHead className="text-xs text-right">Settle</TableHead>
                                  <TableHead className="text-xs">Crew</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : claimSales.length === 0 ? (
                        <div className="text-center py-12">
                          <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-950/40 dark:to-amber-950/40 flex items-center justify-center"
                          >
                            <FileSpreadsheet className="w-10 h-10 text-emerald-400 dark:text-emerald-600" />
                          </motion.div>
                          <h3 className="text-base font-bold text-foreground mb-1">Belum Ada Data Penjualan</h3>
                          <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">Upload file Excel pertama untuk melihat laporan di sini</p>
                          <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30" onClick={() => setShowUploadModal(true)}>
                            <Upload className="w-3.5 h-3.5 mr-1.5" />Upload Penjualan
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Mobile Card View */}
                          <div className="md:hidden space-y-2">
                            {sortedClaimSales.map((sale) => (
                              <motion.div
                                key={sale.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-3 rounded-lg border bg-white dark:bg-gray-900 ${selectedSaleIds.has(sale.id) ? 'border-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800' : ''}`}
                                style={{ borderLeftWidth: '3px', borderLeftColor: sale.crew ? '#059669' : '#f59e0b' }}
                              >
                                <div className="flex items-center gap-2 mb-1.5">
                                  {!sale.crew && (
                                    <button
                                      onClick={() => {
                                        const next = new Set(selectedSaleIds)
                                        if (next.has(sale.id)) next.delete(sale.id)
                                        else next.add(sale.id)
                                        setSelectedSaleIds(next)
                                      }}
                                      className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0"
                                      style={{ backgroundColor: selectedSaleIds.has(sale.id) ? '#059669' : 'transparent', borderColor: selectedSaleIds.has(sale.id) ? '#059669' : 'rgb(156 163 175)' }}
                                    >
                                      {selectedSaleIds.has(sale.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </button>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-mono font-medium truncate">{sale.kodeExtend}</span>
                                  </div>
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmtRp(sale.settle)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                                  <div className="text-muted-foreground">Tanggal</div>
                                  <div className="text-right">{sale.tanggal}</div>
                                  {sale.brand && (<><div className="text-muted-foreground">Brand</div><div className="text-right truncate">{sale.brand}</div></>)}
                                  <div className="text-muted-foreground">Dept</div>
                                  <div className="text-right">{sale.dept || '-'}</div>
                                  <div className="text-muted-foreground">Qty</div>
                                  <div className="text-right">{sale.qty}</div>
                                  <div className="text-muted-foreground">Crew</div>
                                  <div className="text-right">
                                    {sale.crew ? (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate">{sale.crew.name}</span>
                                        {sale.claimedAt && (Date.now() - new Date(sale.claimedAt).getTime() < 120000) && (
                                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-amber-500 dark:text-amber-400 italic">Belum di-claim</span>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Desktop Table View */}
                          <div className="hidden md:block overflow-x-auto rounded-lg border">
                            <Table className="table-stripe table-sticky-head">
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
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
                                  <TableHead className="w-[100px] min-w-[100px] cursor-pointer select-none" onClick={() => { if (claimSortField === 'tanggal') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('tanggal'); setClaimSortDir('desc') } }}>
                                    <span className="inline-flex items-center gap-1">Tanggal{claimSortField === 'tanggal' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                                  </TableHead>
                                  <TableHead className="min-w-[80px]">Dept</TableHead>
                                  <TableHead className="min-w-[120px]">Kode Extend</TableHead>
                                  <TableHead className="text-right min-w-[60px] cursor-pointer select-none" onClick={() => { if (claimSortField === 'qty') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('qty'); setClaimSortDir('desc') } }}>
                                    <span className="inline-flex items-center justify-end gap-1">Qty{claimSortField === 'qty' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                                  </TableHead>
                                  <TableHead className="text-right min-w-[110px] cursor-pointer select-none" onClick={() => { if (claimSortField === 'settle') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('settle'); setClaimSortDir('desc') } }}>
                                    <span className="inline-flex items-center justify-end gap-1">Settle{claimSortField === 'settle' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                                  </TableHead>
                                  <TableHead className="min-w-[160px]">Crew</TableHead>
                                  {isAdmin && <TableHead className="w-[50px]">Aksi</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sortedClaimSales.map((sale) => (
                                  <TableRow
                                    key={sale.id}
                                    className={`hover:bg-muted/30 transition-colors ${selectedSaleIds.has(sale.id) ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''} ${batchSelectedIds.has(sale.id) ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}
                                    style={{ borderLeftWidth: '3px', borderLeftColor: sale.crew ? '#059669' : '#f59e0b' }}
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
                                    <TableCell className="text-xs whitespace-nowrap">{sale.tanggal}</TableCell>
                                    <TableCell className="text-xs">{sale.dept || '-'}</TableCell>
                                    <TableCell className="text-xs font-mono whitespace-nowrap">{sale.kodeExtend}</TableCell>
                                    <TableCell className="text-xs text-right">{sale.qty}</TableCell>
                                    <TableCell className="text-xs text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmtRp(sale.settle)}</TableCell>
                                    {/* Crew column */}
                                    <TableCell>
                                      {sale.crew ? (
                                        <div className="flex items-center gap-1.5">
                                          <div className="relative">
                                            <Avatar className="w-6 h-6">
                                              <AvatarImage src={sale.crew.photo || ''} />
                                              <AvatarFallback className="text-[9px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">{sale.crew.name[0]}</AvatarFallback>
                                            </Avatar>
                                            {/* Green dot for recently claimed (within 2 minutes) */}
                                            {sale.claimedAt && (Date.now() - new Date(sale.claimedAt).getTime() < 120000) && (
                                              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                                            )}
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-xs truncate max-w-[120px] font-medium">{sale.crew.name}</span>
                                            {sale.claimedAt && (
                                              <span className="text-[9px] text-muted-foreground">
                                                {(() => {
                                                  const ago = Date.now() - new Date(sale.claimedAt).getTime()
                                                  if (ago < 60000) return 'baru saja'
                                                  if (ago < 3600000) return `${Math.floor(ago / 60000)}m lalu`
                                                  return new Date(sale.claimedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                })()}
                                              </span>
                                            )}
                                          </div>
                                          {isAdmin && (
                                            <button
                                              onClick={() => handleUnclaimSale(sale.id)}
                                              className="ml-auto shrink-0 p-1 rounded text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                              title="Unclaim"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
                                          <Search className="w-3.5 h-3.5 shrink-0" />
                                          <span className="text-xs italic">Belum di-claim</span>
                                        </div>
                                      )}
                                    </TableCell>
                                    {isAdmin && (
                                      <TableCell>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setDeleteConfirm({ type: 'sale', id: sale.id, name: `${sale.kodeExtend}${sale.crew ? ` — ${sale.crew.name}` : ' (unclaimed)'}` })}>
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
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
              </motion.div>
            </TabsContent>

            {/* ─── Management Tab ───────────────────────── */}
            <TabsContent value="management" className="mt-4 sm:mt-6 pb-8">
              {!isAdmin ? (
                <motion.div {...fadeIn} className="max-w-md mx-auto">
                  <Card className="border-0 shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 text-center">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-white">Admin Login</h2>
                      <p className="text-emerald-100 text-sm mt-1">Masuk untuk mengelola crew dan group</p>
                    </div>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" placeholder="admin" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                      </div>
                      <Button onClick={handleLogin} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/25">
                        <Shield className="w-4 h-4 mr-2" />Masuk
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground">Hubungi admin untuk akses</p>
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
                    <div className="relative max-w-sm">
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
                        <Card className="border-0 shadow-lg overflow-hidden">
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
                            <Table className="table-stripe table-sticky-head">
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
                            <Card className="border-0 shadow-lg overflow-hidden">
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
                                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" />
                                      <XAxis type="number" tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)} fontSize={11} />
                                      <YAxis type="category" dataKey="name" width={80} fontSize={11} tick={{ fill: 'oklch(0.4 0 0)' }} />
                                      <Tooltip formatter={(v: number) => fmtRp(v)} contentStyle={{ borderRadius: '8px', border: '1px solid oklch(0.9 0 0)', fontSize: '12px' }} />
                                      <Bar dataKey="sales" radius={[0, 6, 6, 0]}>
                                        {mgmtCrews.sort((a, b) => b.totalSales - a.totalSales).map((_, i) => (
                                          <Cell key={i} fill={['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'][i % 6]} />
                                        ))}
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
                    { label: 'Hari Ini', value: selectedCrewDetail.todayTotal, qty: selectedCrewDetail.todayQty, icon: Zap, color: 'from-emerald-500 to-teal-600' },
                    { label: 'Minggu Ini', value: selectedCrewDetail.weekTotal, qty: selectedCrewDetail.weekQty, icon: TrendingUp, color: 'from-amber-500 to-orange-600' },
                    { label: 'Bulan Ini', value: selectedCrewDetail.monthTotal, qty: selectedCrewDetail.monthQty, icon: BarChart3, color: 'from-purple-500 to-violet-600' },
                    { label: 'All Time', value: selectedCrewDetail.allTimeTotal, qty: selectedCrewDetail.allTimeQty, icon: Flame, color: 'from-cyan-500 to-sky-600' },
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
                        <Badge variant="outline" className="text-xs">{fmtNum(s.qty)} qty</Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border text-center">
                  <p className="text-xs text-muted-foreground">Total Transaksi</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmtNum(selectedCrewDetail.transactionCount)}</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation Dialog ──────────────── */}
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
      <footer className="mt-auto border-t border-border/50 bg-white/60 dark:bg-gray-950/60 backdrop-blur-xl">
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
          <div className="py-3 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground text-center sm:text-left">
              © {currentYear} <span className="font-semibold text-foreground/70">Ahtjong Labs</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Made with</span>
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              <span className="text-[10px] text-muted-foreground">in Indonesia</span>
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
            className="fixed bottom-20 right-4 sm:right-6 z-40 w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center transition-colors"
            aria-label="Back to top"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

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
        <div className="grid grid-cols-4 gap-3">
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
