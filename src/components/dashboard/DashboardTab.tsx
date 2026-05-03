'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  Trophy, Medal, Target, TrendingUp, Users, Star, Zap, ArrowUpRight, ArrowDownRight,
  BarChart3, Calendar, Flame, Clock, Eye, RefreshCw, Upload, ShoppingCart, Package, X, ChevronRight,
} from 'lucide-react'
import { fmtRp, fmtNum, fadeIn, stagger, AnimatedCounter, SkeletonRow, AchievementBadge, CircularProgress, monthNames } from '@/lib/cms-utils'
import type { DashboardData, CrewStat, GroupAchievement, GroupDetailData } from '@/lib/cms-types'
import LoadingOverlay from '@/components/ui/LoadingOverlay'

interface DashboardTabProps {
  dashboard: DashboardData | null
  dashPeriod: 'today' | 'week' | 'month'
  setDashPeriod: (p: 'today' | 'week' | 'month') => void
  dashLoading: boolean
  isAdmin: boolean
  selectedCrewDetail: CrewStat | null
  setSelectedCrewDetail: (c: CrewStat | null) => void
  selectedGroupDetail: GroupAchievement | null
  setSelectedGroupDetail: (g: GroupAchievement | null) => void
  groupDetailData: GroupDetailData | null
  groupDetailPeriod: 'daily' | 'weekly' | 'monthly'
  setGroupDetailPeriod: (p: 'daily' | 'weekly' | 'monthly') => void
  groupDetailLoading: boolean
  fetchDashboard: () => void
  setActiveTab: (v: string) => void
  crewPhotoPreview: { name: string; photo: string } | null
  setCrewPhotoPreview: (v: { name: string; photo: string } | null) => void
}

const DashboardTab = React.memo(function DashboardTab({
  dashboard, dashPeriod, setDashPeriod, dashLoading, isAdmin,
  selectedCrewDetail, setSelectedCrewDetail,
  selectedGroupDetail, setSelectedGroupDetail,
  groupDetailData, groupDetailPeriod, setGroupDetailPeriod, groupDetailLoading,
  fetchDashboard, setActiveTab,
  crewPhotoPreview, setCrewPhotoPreview,
}: DashboardTabProps) {
  return (
    <TabsContent value="dashboard" className="mt-4 sm:mt-6 pb-8">
      <LoadingOverlay loading={dashLoading} label="Memuat dashboard...">
        {!dashboard && !dashLoading ? (
          <motion.div {...fadeIn} className="text-center py-20">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-950/40 dark:to-emerald-900/40 flex items-center justify-center"
            >
              <BarChart3 className="w-10 h-10 text-emerald-400 dark:text-emerald-600" />
            </motion.div>
            <h3 className="text-base font-bold text-foreground mb-1">Tidak Ada Data Dashboard</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">Dashboard tidak dapat dimuat. Coba refresh halaman.</p>
            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30" onClick={fetchDashboard}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
            </Button>
          </motion.div>
        ) : dashboard ? (
        <motion.div {...stagger} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Penjualan Hari Ini', value: dashboard.totals.today, qty: dashboard.totals.todayQty, icon: Zap, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', trend: dashboard.trends?.today },
              { label: 'Penjualan Minggu Ini', value: dashboard.totals.week, qty: dashboard.totals.weekQty, icon: TrendingUp, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', trend: dashboard.trends?.week },
              { label: 'Penjualan Bulan Ini', value: dashboard.totals.month, qty: dashboard.totals.monthQty, icon: BarChart3, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', trend: dashboard.trends?.month },
              { label: 'Total Transaksi (struk)', value: dashboard.totals.totalTransactions ?? 0, qty: 0, icon: ShoppingCart, gradient: 'from-cyan-500 to-sky-600', shadow: 'shadow-cyan-500/20', trend: null },
            ].map((card, i) => (
              <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.1 }} whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300 } }}>
                <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-default card-hover-glow">
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-300`} />
                  <CardContent className="p-3 sm:p-5 relative">
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
                        return (
                          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
                            className="flex flex-col items-center flex-1 max-w-[150px]">
                            {/* Avatar + rank badge */}
                            <div className="relative mb-1.5 cursor-pointer" onClick={() => crew.photo && setCrewPhotoPreview({ name: crew.name, photo: crew.photo })}>
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
                                <span className="text-[9px] text-gray-500 dark:text-gray-400">{fmtNum(periodQty)} qty</span>
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
                        return (
                          <motion.div initial={{ opacity: 0, scale: 0.8, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 150, damping: 12 }}
                            className="flex flex-col items-center flex-1 max-w-[170px]">
                            {/* Crown bounce */}
                            <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="mb-0.5">
                              <span className="text-2xl sm:text-3xl">👑</span>
                            </motion.div>
                            {/* Avatar with rank badge */}
                            <div className="relative mb-1.5 cursor-pointer" onClick={() => crew.photo && setCrewPhotoPreview({ name: crew.name, photo: crew.photo })}>
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
                                <span className="text-[9px] text-amber-100">{fmtNum(periodQty)} qty</span>
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
                        return (
                          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 180 }}
                            className="flex flex-col items-center flex-1 max-w-[150px]">
                            {/* Avatar + rank badge */}
                            <div className="relative mb-1.5 cursor-pointer" onClick={() => crew.photo && setCrewPhotoPreview({ name: crew.name, photo: crew.photo })}>
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
                                <span className="text-[9px] text-orange-600 dark:text-orange-300">{fmtNum(periodQty)} qty</span>
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

                {/* Full Ranking Table */}
                {dashboard.crewStats.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Ranking</p>
                      <p className="text-[10px] text-muted-foreground">{dashboard.crewStats.length} crew</p>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden max-h-80 overflow-y-auto space-y-2 pr-1">
                      {dashboard.crewStats.map((crew, idx) => {
                        const periodVal = dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
                        const periodQty = dashPeriod === 'today' ? crew.todayQty : dashPeriod === 'week' ? crew.weekQty : crew.monthQty
                        const maxVal = dashboard.crewStats[0] ? (dashPeriod === 'today' ? dashboard.crewStats[0].todayTotal : dashPeriod === 'week' ? dashboard.crewStats[0].weekTotal : dashboard.crewStats[0].monthTotal) : 1
                        const pct = maxVal > 0 ? Math.round((periodVal / maxVal) * 100) : 0
                        const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                        return (
                          <motion.div key={crew.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                            className={`p-3 rounded-xl border transition-colors cursor-pointer ${idx < 3 ? 'bg-gradient-to-r from-amber-50/80 to-transparent dark:from-amber-950/20 border-amber-200/40 dark:border-amber-800/20' : 'bg-white dark:bg-gray-900 border-transparent hover:border-border'}`}
                            onClick={() => setSelectedCrewDetail(crew)}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">
                                {rankMedal ? <span>{rankMedal}</span> : <span className="text-muted-foreground">{idx + 1}</span>}
                              </div>
                              <Avatar className="w-8 h-8 shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); if (crew.photo) setCrewPhotoPreview({ name: crew.name, photo: crew.photo }) }}>
                                <AvatarImage src={crew.photo || ''} />
                                <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                                  {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{crew.name}</p>
                                <p className="text-[10px] text-muted-foreground">{crew.groupName}</p>
                                {/* Progress bar */}
                                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: idx * 0.03 }}
                                    className={`h-full rounded-full ${idx === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : idx === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' : idx === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`} />
                                </div>
                              </div>
                              <div className="text-right shrink-0 pl-2">
                                <p className={`text-xs font-bold ${idx < 3 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtRp(periodVal)}</p>
                                <p className="text-[10px] text-muted-foreground">{fmtNum(periodQty)} qty</p>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                    {/* Desktop Table View */}
                    <div className="hidden md:block max-h-80 overflow-y-auto">
                      <Table className="table-stripe table-sticky-head">
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>Crew</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="w-[200px]">Kontribusi</TableHead>
                            <TableHead className="text-right">Penjualan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dashboard.crewStats.map((crew, idx) => {
                            const periodVal = dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
                            const periodQty = dashPeriod === 'today' ? crew.todayQty : dashPeriod === 'week' ? crew.weekQty : crew.monthQty
                            const maxVal = dashboard.crewStats[0] ? (dashPeriod === 'today' ? dashboard.crewStats[0].todayTotal : dashPeriod === 'week' ? dashboard.crewStats[0].weekTotal : dashboard.crewStats[0].monthTotal) : 1
                            const pct = maxVal > 0 ? Math.round((periodVal / maxVal) * 100) : 0
                            const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                            return (
                              <TableRow key={crew.id} className={`cursor-pointer transition-colors ${idx < 3 ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-100/40 dark:hover:bg-amber-950/20' : ''}`} onClick={() => setSelectedCrewDetail(crew)}>
                                <TableCell className="text-center font-bold">
                                  {rankMedal ? <span className="text-base">{rankMedal}</span> : <span className="text-muted-foreground">{idx + 1}</span>}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2.5">
                                    <Avatar className={`w-8 h-8 ${idx === 0 ? 'ring-1 ring-amber-400' : ''} cursor-pointer`} onClick={(e) => { e.stopPropagation(); if (crew.photo) setCrewPhotoPreview({ name: crew.name, photo: crew.photo }) }}>
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
                                <TableCell className="text-right">
                                  <span className={`font-semibold tabular-nums ${idx < 3 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{fmtRp(periodVal)}</span>
                                </TableCell>
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
                      <motion.div key={g.id} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }} whileTap={{ scale: 0.98 }}>
                        <Card
                          className="border-0 shadow-md bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-800/80 overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-400/50 dark:hover:ring-emerald-600/40 transition-all duration-200"
                          onClick={() => { setSelectedGroupDetail(g); setGroupDetailPeriod('daily') }}
                        >
                          <CardContent className="p-3 sm:p-5">
                            <div className="flex items-center gap-3 mb-4">
                              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-emerald-200 dark:border-emerald-800">
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

          {/* 3-Column Layout: Bar Chart + Line Chart + Recent Activity */}
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Sales Chart */}
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

            {/* Sales Trend Line Chart */}
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

            {/* Recent Activity */}
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
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {dashboard.recentSales.slice(0, 20).map((sale, i) => (
                      <motion.div key={sale.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={sale.crew?.photo || ''} />
                          <AvatarFallback className="text-xs">{(sale.crew?.name || '?')[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{sale.crew?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground truncate">{sale.kodeExtend} • {sale.tanggal}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtRp(sale.settle)}</p>
                          <p className="text-xs text-muted-foreground">Qty: {sale.qty}</p>
                        </div>
                      </motion.div>
                    ))}
                    {dashboard.recentSales.length > 20 && (
                      <Button
                        variant="ghost"
                        className="w-full text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-medium mt-1"
                        onClick={() => setActiveTab('claims')}
                      >
                        Lihat Selebihnya <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      ) : null}
      </LoadingOverlay>

      {/* ─── Crew Photo Preview Modal ─── */}
      <AnimatePresence>
        {crewPhotoPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setCrewPhotoPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative flex flex-col items-center gap-4 p-6 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-border/50"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setCrewPhotoPreview(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <Avatar className="w-28 h-28 sm:w-36 sm:h-36 border-4 border-emerald-300 dark:border-emerald-700 shadow-xl shadow-emerald-500/20">
                <AvatarImage src={crewPhotoPreview.photo} className="object-cover" />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold">
                  {crewPhotoPreview.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-base font-bold text-foreground">{crewPhotoPreview.name}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TabsContent>
  )
})

export default DashboardTab
