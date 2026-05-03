'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { X, Users, Package, DollarSign, ShoppingCart, Layers, Percent, Target } from 'lucide-react'
import { fmtRp, fmtNum } from '@/lib/cms-utils'
import type { GroupAchievement, GroupDetailData } from '@/lib/cms-types'

interface GroupDetailModalProps {
  selectedGroupDetail: GroupAchievement | null
  setSelectedGroupDetail: (g: GroupAchievement | null) => void
  groupDetailData: GroupDetailData | null
  groupDetailPeriod: 'daily' | 'weekly' | 'monthly'
  setGroupDetailPeriod: (p: 'daily' | 'weekly' | 'monthly') => void
  groupDetailLoading: boolean
}

function getAchievementColor(pct: number) {
  if (pct >= 100) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', bar: 'bg-emerald-500' }
  if (pct >= 75) return { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', bar: 'bg-blue-500' }
  if (pct >= 50) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', bar: 'bg-amber-500' }
  if (pct >= 25) return { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40', bar: 'bg-orange-500' }
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', bar: 'bg-red-500' }
}

export default function GroupDetailModal({
  selectedGroupDetail, setSelectedGroupDetail,
  groupDetailData, groupDetailPeriod, setGroupDetailPeriod, groupDetailLoading,
}: GroupDetailModalProps) {
  return (
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

                  {/* ─── Target Per Crew Summary ─── */}
                  {(groupDetailData.crewMonthlyTarget > 0) && (
                    <div className="p-4 rounded-xl border bg-gradient-to-br from-emerald-50/50 to-amber-50/30 dark:from-emerald-950/20 dark:to-amber-950/10 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                          <Target className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Target Per Crew</p>
                          <p className="text-[10px] text-muted-foreground">
                            {fmtRp(selectedGroupDetail.monthlyTarget)} grup ÷ {selectedGroupDetail.crewCount} crew = {fmtRp(groupDetailData.crewMonthlyTarget)}/crew/bulan
                          </p>
                        </div>
                      </div>
                      {/* Weekly breakdown */}
                      <div className="grid grid-cols-4 gap-2">
                        {groupDetailData.weeklyTargetPcts.map((pct, i) => {
                          const target = groupDetailData.crewWeeklyTargets[i] || 0
                          const isCurrentWeek = (i + 1) === groupDetailData.currentWeek
                          return (
                            <div
                              key={i}
                              className={`text-center p-2 rounded-lg border transition-colors ${
                                isCurrentWeek
                                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 ring-1 ring-amber-300/50'
                                  : 'bg-white dark:bg-gray-800 border-border/50'
                              }`}
                            >
                              <p className="text-[9px] text-muted-foreground font-medium">W{i + 1}</p>
                              <p className="text-[9px] text-muted-foreground">{pct}%</p>
                              <p className="text-xs font-bold tabular-nums">{fmtRp(target)}</p>
                              {isCurrentWeek && (
                                <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase">Sekarang</span>
                              )}
                            </div>
                          )
                        })}
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
                                <TableHead className="text-[10px] uppercase tracking-wider text-right">Penjualan</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider text-right">Target</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider text-right">Achievement</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider text-right">Qty</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider text-right">Struk</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider text-right">Basket</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {groupDetailData.crews.map((c, idx) => {
                                const aColor = getAchievementColor(c.crewMonthlyAchievement)
                                return (
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
                                    <TableCell className="text-right text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtRp(c.totalSettle)}</TableCell>
                                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{fmtRp(c.crewMonthlyTarget)}</TableCell>
                                    <TableCell className="text-right">
                                      <span className={`text-xs font-bold ${aColor.text}`}>
                                        {c.crewMonthlyAchievement}%
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-medium tabular-nums">{fmtNum(c.totalQty)}</TableCell>
                                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{fmtNum(c.totalStruk)}</TableCell>
                                    <TableCell className="text-right text-xs tabular-nums font-medium text-purple-600 dark:text-purple-400">{c.basketSize.toFixed(2)}</TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-3">
                          {groupDetailData.crews.map((c, idx) => {
                            const aColor = getAchievementColor(c.crewMonthlyAchievement)
                            return (
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
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${aColor.bg} ${aColor.text}`}>
                                      {c.crewMonthlyAchievement}%
                                    </span>
                                  </div>
                                  {/* Stats grid with Target */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="text-center p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                                      <p className="text-[9px] text-muted-foreground">Penjualan</p>
                                      <p className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{fmtRp(c.totalSettle)}</p>
                                    </div>
                                    <div className="text-center p-1.5 rounded-lg bg-muted/50">
                                      <p className="text-[9px] text-muted-foreground">Target</p>
                                      <p className="text-xs font-bold tabular-nums">{fmtRp(c.crewMonthlyTarget)}</p>
                                    </div>
                                    <div className="text-center p-1.5 rounded-lg bg-muted/50">
                                      <p className="text-[9px] text-muted-foreground">Qty</p>
                                      <p className="text-xs font-bold tabular-nums">{fmtNum(c.totalQty)}</p>
                                    </div>
                                    <div className="text-center p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                                      <p className="text-[9px] text-purple-600 dark:text-purple-400">Basket</p>
                                      <p className="text-xs font-bold tabular-nums text-purple-700 dark:text-purple-300">{c.basketSize.toFixed(2)}</p>
                                    </div>
                                  </div>
                                  {/* Achievement bar */}
                                  {c.crewMonthlyTarget > 0 && (
                                    <div className="mt-2 space-y-1">
                                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${Math.min(c.crewMonthlyAchievement, 100)}%` }}
                                          transition={{ duration: 0.6, delay: idx * 0.05 }}
                                          className={`h-full rounded-full ${aColor.bar}`}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )
                          })}
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
  )
}
