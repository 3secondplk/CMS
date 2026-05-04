'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Shield, LogOut, CheckCircle, Upload, RotateCcw, Trash2,
  UserPlus, UserMinus, FolderPlus, Clock, RefreshCw, Loader2,
} from 'lucide-react'
import { safeFetch, timeAgo, fadeIn } from '@/lib/cms-utils'

// ─── Types ────────────────────────────────────────────────
interface ActivityEntry {
  id: string
  action: string
  description: string
  crewName?: string | null
  saleId?: string | null
  adminName: string
  details: Record<string, unknown>
  createdAt: string
}

// ─── Action → Icon/Color Config ───────────────────────────
const actionConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  LOGIN:         { icon: Shield,      color: 'text-[#B8321E] dark:text-[#F07050]', bg: 'bg-[#E6BAA3] dark:bg-[#B8321E]/20', label: 'Login' },
  LOGOUT:        { icon: LogOut,       color: 'text-gray-600 dark:text-gray-400',      bg: 'bg-gray-100 dark:bg-gray-800/40',      label: 'Logout' },
  CLAIM_SALES:   { icon: CheckCircle,  color: 'text-[#9A9475] dark:text-[#B2AC88]',    bg: 'bg-[#B2AC88]/20 dark:bg-[#9A9475]/30',    label: 'Claim Penjualan' },
  IMPORT_SALES:  { icon: Upload,       color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-100 dark:bg-blue-900/40',      label: 'Import Data' },
  UNCLAIM_SALE:  { icon: RotateCcw,    color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-100 dark:bg-amber-900/40',    label: 'Unclaim Penjualan' },
  DELETE_SALE:   { icon: Trash2,       color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-100 dark:bg-red-900/40',        label: 'Hapus Penjualan' },
  CREATE_CREW:   { icon: UserPlus,     color: 'text-[#B8321E] dark:text-[#F07050]', bg: 'bg-[#E6BAA3] dark:bg-[#B8321E]/20', label: 'Tambah Crew' },
  DELETE_CREW:   { icon: UserMinus,    color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-100 dark:bg-red-900/40',        label: 'Hapus Crew' },
  CREATE_GROUP:  { icon: FolderPlus,   color: 'text-purple-600 dark:text-purple-400',  bg: 'bg-purple-100 dark:bg-purple-900/40',  label: 'Tambah Group' },
  DELETE_GROUP:  { icon: Trash2,       color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-100 dark:bg-red-900/40',        label: 'Hapus Group' },
}

function getActionConfig(action: string) {
  return actionConfig[action] || { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: action }
}

// ─── Component ────────────────────────────────────────────
interface ActivityLogPanelProps {
  isAdmin: boolean
}

export default function ActivityLogPanel({ isAdmin }: ActivityLogPanelProps) {
  const [logs, setLogs] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const res = await safeFetch('/api/activity-log?limit=30')
      if (!res.ok) return
      const data: ActivityEntry[] = await res.json()
      setLogs(data)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    if (!isAdmin) return
    fetchLogs()

    // Auto-refresh every 60 seconds
    intervalRef.current = setInterval(() => fetchLogs(true), 60_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isAdmin, fetchLogs])

  if (!isAdmin) return null

  return (
    <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
      <Card className="border-0 shadow-lg overflow-hidden glass-card">
        {/* Header */}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Log Aktivitas</CardTitle>
              <p className="text-[10px] text-muted-foreground">Aktivitas terbaru di sistem</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="ml-auto h-8 w-8"
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              aria-label="Refresh log aktivitas"
            >
              <motion.div
                animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={refreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'text-[#E14227]' : 'text-muted-foreground'}`} />
              </motion.div>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            /* Loading skeleton */
            <div className="space-y-3 p-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded-full w-3/4" />
                    <div className="h-2.5 bg-muted rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            /* Empty state */
            <div className="py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Belum ada aktivitas</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Aktivitas admin akan muncul di sini</p>
            </div>
          ) : (
            /* Timeline list */
            <div className="max-h-96 overflow-y-auto pr-1 space-y-0.5">
              <AnimatePresence mode="popLayout">
                {logs.map((log, idx) => {
                  const config = getActionConfig(log.action)
                  const Icon = config.icon
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ delay: idx * 0.02, duration: 0.2 }}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {log.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                            {config.label}
                          </Badge>
                          <span className="truncate">{log.adminName}</span>
                          <span className="ml-auto shrink-0 tabular-nums">{timeAgo(log.createdAt)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
