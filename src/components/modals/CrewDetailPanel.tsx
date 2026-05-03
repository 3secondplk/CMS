'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { X, Zap, TrendingUp, BarChart3, Flame, Target, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react'
import { fmtRp, fmtNum, CircularProgress } from '@/lib/cms-utils'
import type { CrewStat } from '@/lib/cms-types'

interface CrewDetailPanelProps {
  selectedCrewDetail: CrewStat | null
  setSelectedCrewDetail: (c: CrewStat | null) => void
}

function getAchievementColor(pct: number) {
  if (pct >= 100) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', bar: 'bg-emerald-500', ring: 'ring-emerald-200 dark:ring-emerald-800' }
  if (pct >= 75) return { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', bar: 'bg-blue-500', ring: 'ring-blue-200 dark:ring-blue-800' }
  if (pct >= 50) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', bar: 'bg-amber-500', ring: 'ring-amber-200 dark:ring-amber-800' }
  if (pct >= 25) return { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40', bar: 'bg-orange-500', ring: 'ring-orange-200 dark:ring-orange-800' }
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', bar: 'bg-red-500', ring: 'ring-red-200 dark:ring-red-800' }
}

export default function CrewDetailPanel({ selectedCrewDetail, setSelectedCrewDetail }: CrewDetailPanelProps) {
  if (!selectedCrewDetail) return null

  const crew = selectedCrewDetail
  const monthColor = getAchievementColor(crew.crewMonthlyAchievement)
  const weekColor = getAchievementColor(crew.crewWeeklyAchievement)

  return (
    <AnimatePresence>
      {selectedCrewDetail && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSelectedCrewDetail(null)} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-white dark:bg-gray-900 border-l shadow-2xl z-50 overflow-y-auto">
            <div className="p-5 sm:p-6 space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Statistik Crew</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCrewDetail(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Crew Info */}
              <div className="flex items-center gap-3">
                <Avatar className="w-14 h-14 border-2 border-emerald-200 dark:border-emerald-800">
                  <AvatarImage src={crew.photo || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-lg">
                    {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{crew.name}</p>
                  <p className="text-sm text-muted-foreground">{crew.groupName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{crew.employeeId}</p>
                </div>
              </div>

              {/* ─── TARGET SECTION ─── */}
              <div className="p-4 rounded-xl border bg-gradient-to-br from-emerald-50/50 to-amber-50/30 dark:from-emerald-950/20 dark:to-amber-950/10 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Target Per Crew</p>
                    <p className="text-[10px] text-muted-foreground">{fmtRp(crew.groupMonthlyTarget)} grup ÷ {crew.groupName.split(' ')[0]} crew</p>
                  </div>
                </div>

                {/* Monthly Target */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Target Bulanan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{fmtRp(crew.crewMonthlyTarget)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${monthColor.bg} ${monthColor.text}`}>
                        {crew.crewMonthlyAchievement}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-muted/80 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(crew.crewMonthlyAchievement, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${monthColor.bar}`}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtRp(crew.monthTotal)} dari {fmtRp(crew.crewMonthlyTarget)}
                    {crew.crewMonthlyAchievement >= 100 && (
                      <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">✅ Tercapai!</span>
                    )}
                  </p>
                </div>

                {/* Weekly Targets Grid */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Target Mingguan</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {crew.crewWeeklyTargets.map((target, i) => {
                      const isCurrentWeek = (i + 1) === crew.currentWeek
                      const weekAchievement = target > 0 ? Math.round((crew.weekTotal / target) * 100) : 0
                      const wColor = getAchievementColor(isCurrentWeek ? crew.crewWeeklyAchievement : weekAchievement)

                      return (
                        <motion.div
                          key={i}
                          whileHover={{ y: -1 }}
                          className={`text-center p-2 rounded-lg border transition-colors overflow-hidden ${
                            isCurrentWeek
                              ? `${wColor.bg} ${wColor.ring} ring-1`
                              : 'bg-white dark:bg-gray-800 border-border/50'
                          }`}
                        >
                          <p className="text-[9px] text-muted-foreground font-medium">W{i + 1}</p>
                          <p className="text-[10px] sm:text-xs font-bold tabular-nums truncate min-w-0" title={fmtRp(target)}>{fmtRp(target)}</p>
                          {isCurrentWeek && (
                            <p className={`text-[9px] font-bold ${wColor.text}`}>
                              {crew.crewWeeklyAchievement}%
                            </p>
                          )}
                          {isCurrentWeek && (
                            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(crew.crewWeeklyAchievement, 100)}%` }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className={`h-full rounded-full ${wColor.bar}`}
                              />
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                  {crew.crewWeeklyAchievement >= 100 && (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold">Target Minggu {crew.currentWeek} tercapai!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── PERFORMANCE STATS ─── */}
              <div className="space-y-3">
                {[
                  { label: 'Hari Ini', value: crew.todayTotal, qty: crew.todayQty, struk: crew.todayStruk, icon: Zap, color: 'from-emerald-500 to-teal-600' },
                  { label: 'Minggu Ini', value: crew.weekTotal, qty: crew.weekQty, struk: crew.weekStruk, icon: TrendingUp, color: 'from-amber-500 to-orange-600' },
                  { label: 'Bulan Ini', value: crew.monthTotal, qty: crew.monthQty, struk: crew.monthStruk, icon: BarChart3, color: 'from-purple-500 to-violet-600' },
                  { label: 'All Time', value: crew.allTimeTotal, qty: crew.allTimeQty, struk: crew.allTimeStruk, icon: Flame, color: 'from-cyan-500 to-sky-600' },
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

              {/* Total Transaksi */}
              <div className="p-3 rounded-xl bg-muted/50 border text-center">
                <p className="text-xs text-muted-foreground">Total Transaksi (item rows)</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmtNum(crew.transactionCount)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{fmtNum(crew.allTimeStruk)} struk unik (id transaksi)</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
