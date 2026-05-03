'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Upload, ShoppingCart, UploadCloud, Download, Trash2, Search, CheckCircle2,
  Clock, Flame, Sparkles, Users, Calendar, CalendarDays, CalendarRange,
  Package, PartyPopper, FileSpreadsheet, Edit2, X,
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
  SlidersHorizontal, ChevronDown,
} from 'lucide-react'
import { fmtRp, fmtNum, fadeIn, stagger, AnimatedCounter, SkeletonRow, timeAgo, getDeptColor, getPageNumbers, getWeekRange, getMonthRange } from '@/lib/cms-utils'
import type { ClaimSale, Crew } from '@/lib/cms-types'
import UploadModal from '@/components/modals/UploadModal'
import LoadingOverlay from '@/components/ui/LoadingOverlay'

interface ClaimsTabProps {
  // Data
  claimSales: ClaimSale[]
  claimTotal: number
  claimTotalPages: number
  claimPage: number
  claimSearch: string
  claimDateFrom: string
  claimDateTo: string
  claimFilterProgram: string
  claimFilterCrew: string
  claimShowClaimed: 'unclaimed' | 'claimed' | 'all'
  claimsLoading: boolean
  claimSortField: string
  claimSortDir: 'asc' | 'desc'
  programs: string[]
  crews: Crew[]
  selectedSaleIds: Set<string>
  claimCrewSearch: string
  selectedClaimCrewId: string
  claimSummary: { totalQty: number; totalSettle: number; totalStruk: number; basketSize: number; pricePoint: number } | null
  isAdmin: boolean
  todayStr: string
  // Computed
  sortedClaimSales: ClaimSale[]
  selectedItemsTotal: number
  selectedItemsPreview: ClaimSale[]
  selectedClaimCrew: Crew | null
  claimCrewResults: Crew[]
  claimStats: { unclaimedCount: number; claimedCount: number; unclaimedSettle: number; claimedSettle: number; todayActivity: number; todaySettle: number; todayItems: number; todayStruk: number }
  activeQuickFilter: 'today' | 'week' | 'month' | 'all' | 'custom'
  activeFilterCount: number
  // Upload state
  uploading: boolean
  uploadProgress: number
  uploadResult: { totalRows: number; totalQty: number; totalSettle: number; uniqueProducts: number; duplicateRows?: number } | null
  showUploadModal: boolean
  isDragOver: boolean
  claiming: boolean
  showFilterPanel: boolean
  batchSelectedIds: Set<string>
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>
  // Setters
  setClaimSearch: (v: string) => void
  setClaimDateFrom: (v: string) => void
  setClaimDateTo: (v: string) => void
  setClaimFilterProgram: (v: string) => void
  setClaimFilterCrew: (v: string) => void
  setClaimShowClaimed: (v: 'unclaimed' | 'claimed' | 'all') => void
  setClaimSortField: (v: string) => void
  setClaimSortDir: (v: 'asc' | 'desc') => void
  setSelectedSaleIds: (s: Set<string>) => void
  setClaimCrewSearch: (v: string) => void
  setSelectedClaimCrewId: (v: string) => void
  setShowUploadModal: (v: boolean) => void
  setIsDragOver: (v: boolean) => void
  setShowFilterPanel: (v: boolean) => void
  setBatchSelectedIds: (s: Set<string>) => void
  // Handlers
  fetchClaims: (page: number) => void
  handleClaimSales: (retryCount?: number) => void
  handleExport: () => void
  handleUnclaimSale: (id: string) => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleDropFile: (file: File) => void
  openEditSale: (sale: ClaimSale) => void
  setDeleteConfirm: (v: { type: 'crew' | 'group' | 'sale' | 'batch-sale'; ids?: string[]; id?: string; name: string } | null) => void
  setActiveTab: (v: string) => void
}

const ClaimsTab = React.memo(function ClaimsTab(props: ClaimsTabProps) {
  const {
    claimSales, claimTotal, claimTotalPages, claimPage, claimSearch,
    claimDateFrom, claimDateTo, claimFilterProgram, claimFilterCrew, claimShowClaimed,
    claimsLoading, claimSortField, claimSortDir,
    programs, crews, selectedSaleIds, claimCrewSearch, selectedClaimCrewId,
    claimSummary, isAdmin, todayStr,
    sortedClaimSales, selectedItemsTotal, selectedItemsPreview, selectedClaimCrew, claimCrewResults,
    claimStats, activeQuickFilter, activeFilterCount,
    uploading, uploadProgress, uploadResult, showUploadModal, isDragOver,
    claiming, showFilterPanel, batchSelectedIds,
    fileInputRef,
    setClaimSearch, setClaimDateFrom, setClaimDateTo,
    setClaimFilterProgram, setClaimFilterCrew, setClaimShowClaimed,
    setClaimSortField, setClaimSortDir,
    setSelectedSaleIds, setClaimCrewSearch, setSelectedClaimCrewId,
    setShowUploadModal, setIsDragOver, setShowFilterPanel, setBatchSelectedIds,
    fetchClaims, handleClaimSales, handleExport, handleUnclaimSale,
    handleFileUpload, handleDropFile, openEditSale, setDeleteConfirm, setActiveTab,
  } = props

  return (
    <TabsContent value="claims" className="mt-4 sm:mt-6 pb-8 overflow-hidden">
      <motion.div {...stagger} className="space-y-6">
        {/* Upload Modal Dialog */}
        <UploadModal
          showUploadModal={showUploadModal}
          setShowUploadModal={setShowUploadModal}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadResult={uploadResult}
          isDragOver={isDragOver}
          setIsDragOver={setIsDragOver}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          handleDropFile={handleDropFile}
        />

        {/* ── Section A: Import Hari Ini (Hero) ── */}
        {claimTotal > 0 && !claimsLoading && (
          <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
            <div className="relative overflow-hidden rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-gradient-to-r from-emerald-50 to-teal-50/60 dark:from-emerald-950/20 dark:to-teal-950/10 p-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-600 opacity-[0.07] rounded-full -translate-y-8 translate-x-8" />
              <div className="relative flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Import Hari Ini</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight">
                    {fmtRp(claimStats.todaySettle)}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                  <div className="text-center">
                    <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmtNum(claimStats.todayItems)}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">item</p>
                  </div>
                  <div className="w-px h-8 bg-emerald-200/60 dark:bg-emerald-800/40" />
                  <div className="text-center">
                    <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmtNum(claimStats.todayStruk)}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">struk</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Section B: Progress Claim Overview ── */}
        {claimSummary && claimTotal > 0 && !claimsLoading && (() => {
          const totalSettle = claimSummary.totalSettle ?? 0
          const claimedPct = totalSettle > 0 ? Math.round(claimStats.claimedSettle / totalSettle * 100) : 0
          const unclaimedPct = totalSettle > 0 ? 100 - claimedPct : 0
          return (
            <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
              <Card className="border-0 shadow-lg card-hover-glow overflow-hidden">
                <CardContent className="p-4 sm:p-6 space-y-5">
                  {/* Total Settle Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Settle</p>
                      <p className="text-xl sm:text-2xl font-extrabold tracking-tight">{fmtRp(totalSettle)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">{fmtNum(claimTotal)} data</Badge>
                    </div>
                  </div>

                  {/* Dual Progress Bar */}
                  <div className="space-y-2">
                    <div className="h-3 sm:h-4 rounded-full bg-muted/80 overflow-hidden flex shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${claimedPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-l-full"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${unclaimedPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                        className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-r-full"
                      />
                    </div>
                    <div className="flex justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400">Claimed {claimedPct}%</span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground ml-1">({fmtRp(claimStats.claimedSettle)})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">({fmtRp(claimStats.unclaimedSettle)})</span>
                        <span className="text-[10px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400">Unclaimed {unclaimedPct}%</span>
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      </div>
                    </div>
                  </div>

                  {/* 4 Mini Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { label: 'Total Struk', value: fmtNum(claimSummary.totalStruk ?? 0), icon: FileSpreadsheet, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', sub: 'transaksi' },
                      { label: 'Basket Size', value: (claimSummary.basketSize ?? 0).toFixed(2), icon: ShoppingCart, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', sub: 'per struk' },
                      { label: 'Price Point', value: fmtRp(claimSummary.pricePoint ?? 0), icon: Sparkles, gradient: 'from-cyan-500 to-sky-600', shadow: 'shadow-cyan-500/20', sub: 'per item' },
                      { label: 'Total Qty', value: fmtNum(claimSummary.totalQty ?? 0), icon: Package, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', sub: 'jumlah item' },
                    ].map((s, i) => (
                      <motion.div key={i} whileHover={{ y: -2, transition: { type: 'spring', stiffness: 300 } }}>
                        <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/40 to-muted/20 dark:from-muted/20 dark:to-muted/5 p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">{s.label}</p>
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${s.gradient} ${s.shadow} shadow flex items-center justify-center`}>
                              <s.icon className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <p className="text-sm sm:text-lg font-bold tracking-tight truncate">{s.value}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })()}

        {/* Section 4: Laporan Penjualan Table */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <Card className="border-0 shadow-lg card-hover-glow overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 min-w-0">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingCart className="w-5 h-5 text-emerald-500 shrink-0" />
                    <CardTitle className="text-base truncate">Laporan Penjualan</CardTitle>
                    <Badge variant="outline" className="text-xs shrink-0">{fmtNum(claimTotal)} data</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20" onClick={() => setShowUploadModal(true)}>
                      <UploadCloud className="w-3.5 h-3.5" /> Upload
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

                {/* ─── MOBILE: Premium collapsible filter panel ─── */}
                <div className="sm:hidden">
                  {/* Toggle button */}
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100/80 dark:from-gray-900 dark:to-gray-800/80 border border-border/60 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Filter & Pencarian</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeFilterCount > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                      <motion.div animate={{ rotate: showFilterPanel ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Expandable panel */}
                  <AnimatePresence>
                    {showFilterPanel && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 space-y-3">
                          {/* Search */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Cari kode, brand, dept, crew..."
                              value={claimSearch}
                              onChange={e => setClaimSearch(e.target.value)}
                              className="pl-9 h-10 w-full rounded-xl bg-white dark:bg-gray-900 border-border/60 text-sm"
                            />
                            {claimSearch && (
                              <button onClick={() => setClaimSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

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

                          {/* Date range — each date in its own card row */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 px-1">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rentang Tanggal</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground px-1">Dari</span>
                                <Input
                                  type="date"
                                  value={claimDateFrom}
                                  onChange={e => setClaimDateFrom(e.target.value)}
                                  className="h-10 w-full text-xs rounded-xl bg-white dark:bg-gray-900 border-border/60"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground px-1">Sampai</span>
                                <Input
                                  type="date"
                                  value={claimDateTo}
                                  onChange={e => setClaimDateTo(e.target.value)}
                                  className="h-10 w-full text-xs rounded-xl bg-white dark:bg-gray-900 border-border/60"
                                />
                              </div>
                            </div>
                            {(claimDateFrom || claimDateTo) && (
                              <button
                                onClick={() => { setClaimDateFrom(''); setClaimDateTo('') }}
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium px-1 flex items-center gap-1 active:opacity-70"
                              >
                                <X className="w-2.5 h-2.5" /> Reset tanggal
                              </button>
                            )}
                          </div>
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
                    <Input placeholder="Cari kode, brand, dept, crew..." value={claimSearch} onChange={e => { setClaimSearch(e.target.value) }}
                      className="pl-9 h-9 w-full sm:w-72" />
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
                      <Input type="date" value={claimDateFrom} onChange={e => setClaimDateFrom(e.target.value)} className="h-7 w-[120px] text-xs border-0 shadow-none p-0" />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input type="date" value={claimDateTo} onChange={e => setClaimDateTo(e.target.value)} className="h-7 w-[120px] text-xs border-0 shadow-none p-0" />
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0" title="Reset tanggal" onClick={() => { setClaimDateFrom(''); setClaimDateTo('') }}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden">
            <LoadingOverlay loading={claimsLoading} label="Memuat data penjualan...">
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
                          <TableHead className="text-[11px] w-[40px]" />
                          <TableHead className="text-[11px] w-[100px]">Tanggal</TableHead>
                          <TableHead className="text-[11px]">Dept</TableHead>
                          <TableHead className="text-[11px]">Kode Extend</TableHead>
                          <TableHead className="text-[11px]">Brand</TableHead>
                          <TableHead className="text-[11px] text-right">Qty</TableHead>
                          <TableHead className="text-[11px] text-right">Settle</TableHead>
                          <TableHead className="text-[11px]">Crew</TableHead>
                          <TableHead className="text-[11px]">Program</TableHead>
                          <TableHead className="text-[11px] w-[80px]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={10} />)}
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
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 flex items-center justify-center"
                    >
                      <Clock className="w-10 h-10 text-amber-400 dark:text-amber-600" />
                    </motion.div>
                    <h3 className="text-base font-bold text-foreground mb-1">Belum Ada Data yang Di-claim</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">Data penjualan yang sudah di-claim akan muncul di sini</p>
                  </div>
                ) : (
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
                          className={`sale-card shadow-sm border border-border/40 ${isClaimed ? 'sale-claimed' : ''} ${isSelected ? 'sale-selected' : ''}`}
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
                                <p className={`text-sm font-mono font-bold tracking-tight truncate ${isClaimed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{sale.kodeExtend}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {sale.tanggal}
                                  <span className="text-muted-foreground/40 mx-0.5">·</span>
                                  <Package className="w-2.5 h-2.5" />
                                  {sale.qty} qty
                                  {sale.brand && (
                                    <>
                                      <span className="text-muted-foreground/40 mx-0.5">·</span>
                                      <span className="text-foreground/70 font-medium">{sale.brand.length > 15 ? sale.brand.slice(0, 15) + '…' : sale.brand}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                              {/* Status pill */}
                              {isClaimed ? (
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 shrink-0">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
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
                                  <span className="tag-chip tag-chip-payment">
                                    {sale.pembayaran.length > 12 ? sale.pembayaran.slice(0, 12) + '…' : sale.pembayaran}
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
                    <Table className="table-stripe">
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
                          <TableHead className="w-[100px] min-w-[100px] cursor-pointer select-none text-[11px] hover:text-foreground" onClick={() => { if (claimSortField === 'tanggal') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('tanggal'); setClaimSortDir('desc') } }}>
                            <span className="inline-flex items-center gap-1">Tanggal{claimSortField === 'tanggal' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                          </TableHead>
                          <TableHead className="min-w-[80px] cursor-pointer select-none text-[11px] hover:text-foreground" onClick={() => { if (claimSortField === 'dept') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('dept'); setClaimSortDir('desc') } }}>
                            <span className="inline-flex items-center gap-1">Dept{claimSortField === 'dept' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                          </TableHead>
                          <TableHead className="min-w-[120px] cursor-pointer select-none text-[11px] hover:text-foreground" onClick={() => { if (claimSortField === 'kodeExtend') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('kodeExtend'); setClaimSortDir('desc') } }}>
                            <span className="inline-flex items-center gap-1">Kode Extend{claimSortField === 'kodeExtend' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                          </TableHead>
                          <TableHead className="min-w-[100px] cursor-pointer select-none text-[11px] hover:text-foreground" onClick={() => { if (claimSortField === 'brand') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('brand'); setClaimSortDir('desc') } }}>
                            <span className="inline-flex items-center gap-1">Brand{claimSortField === 'brand' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                          </TableHead>
                          <TableHead className="text-right min-w-[60px] cursor-pointer select-none text-[11px] hover:text-foreground" onClick={() => { if (claimSortField === 'qty') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('qty'); setClaimSortDir('desc') } }}>
                            <span className="inline-flex items-center justify-end gap-1">Qty{claimSortField === 'qty' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                          </TableHead>
                          <TableHead className="text-right min-w-[110px] cursor-pointer select-none text-[11px] hover:text-foreground" onClick={() => { if (claimSortField === 'settle') setClaimSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setClaimSortField('settle'); setClaimSortDir('desc') } }}>
                            <span className="inline-flex items-center justify-end gap-1">Settle{claimSortField === 'settle' && (claimSortDir === 'asc' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}</span>
                          </TableHead>
                          <TableHead className="min-w-[160px] text-[11px]">Crew</TableHead>
                          <TableHead className="min-w-[80px] text-[11px]">Program</TableHead>
                          {isAdmin && <TableHead className="w-[80px] text-[11px]">Aksi</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedClaimSales.map((sale) => (
                          <TableRow
                            key={sale.id}
                            className={`sale-row group ${selectedSaleIds.has(sale.id) ? 'row-selected' : ''} ${batchSelectedIds.has(sale.id) ? 'bg-red-50/50 dark:bg-red-950/10' : ''} ${sale.crew ? 'opacity-75' : ''}`}
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
                            {/* Dept column */}
                            <TableCell className="text-xs">
                              {sale.dept ? (
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-2 h-2 rounded-full ${getDeptColor(sale.dept)} shrink-0`} />
                                  <span className="text-foreground/80">{sale.dept}</span>
                                </div>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            {/* Kode Extend column */}
                            <TableCell className="text-xs font-mono whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className={`font-semibold ${sale.crew ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{sale.kodeExtend}</span>
                              </div>
                            </TableCell>
                            {/* Brand column (NEW) */}
                            <TableCell className="text-xs">
                              {sale.brand ? (
                                <span className="text-foreground/70">{sale.brand.length > 18 ? sale.brand.slice(0, 18) + '…' : sale.brand}</span>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{sale.qty}</TableCell>
                            <TableCell className="text-xs text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums">{fmtRp(sale.settle)}</TableCell>
                            {/* Crew column */}
                            <TableCell>
                              {sale.crew ? (
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <Avatar className="w-6 h-6 ring-1 ring-emerald-200 dark:ring-emerald-800">
                                      <AvatarImage src={sale.crew?.photo || ''} />
                                      <AvatarFallback className="text-[8px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold">{(sale.crew?.name || '?')[0]}</AvatarFallback>
                                    </Avatar>
                                    {sale.claimedAt && (Date.now() - new Date(sale.claimedAt).getTime() < 120000) && (
                                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] truncate max-w-[120px] font-semibold text-foreground">{sale.crew?.name || 'Unknown'}</span>
                                    {sale.claimedAt && (
                                      <span className="text-[9px] text-muted-foreground">{timeAgo(sale.claimedAt)}</span>
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
                                <div className="flex items-center gap-1.5 text-muted-foreground/60">
                                  <Search className="w-3.5 h-3.5 shrink-0" />
                                  <span className="text-[11px] italic">Belum di-claim</span>
                                </div>
                              )}
                            </TableCell>
                            {/* Program column */}
                            <TableCell>
                              {sale.program ? (
                                <span className="tag-chip tag-chip-program">{sale.program}</span>
                              ) : <span className="text-xs text-muted-foreground">-</span>}
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <div className="flex items-center gap-0.5">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => openEditSale(sale)}>
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setDeleteConfirm({ type: 'sale', id: sale.id, name: `${sale.kodeExtend}${sale.crew ? ` — ${sale.crew.name}` : ' (unclaimed)'}` })}>
                                    <Trash2 className="w-3 h-3" />
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
            </LoadingOverlay>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Mobile Selected Items Bar removed — merged into Floating Claim Bar below ── */}
      </motion.div>
    </TabsContent>
  )
})

export default ClaimsTab
