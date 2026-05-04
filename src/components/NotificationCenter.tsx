'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Bell, BellOff, Shield, LogOut, CheckCircle, Upload,
  RotateCcw, Trash2, UserPlus, UserMinus, FolderPlus,
  CheckCheck, ExternalLink, Loader2,
} from 'lucide-react'
import { safeFetch, timeAgo } from '@/lib/cms-utils'
import { getWIBDate } from '@/lib/cms-utils'

// ─── Types ──────────────────────────────────────────────
interface ActivityLogEntry {
  id: string
  action: string
  description: string
  crewName: string | null
  saleId: string | null
  adminName: string
  details: Record<string, unknown>
  createdAt: string
}

type TimeGroup = 'today' | 'yesterday' | 'older'

interface NotificationCenterProps {
  notificationCount: number
  bellSwingTrigger: boolean
}

// ─── Action-to-icon/color mapping ──────────────────────
const ACTION_CONFIG: Record<string, { icon: typeof Shield; color: string; bg: string; label: string }> = {
  LOGIN:       { icon: Shield,     color: 'text-[#E14227]',   bg: 'bg-[#F0EAD6] dark:bg-[#B8321E]/30',   label: 'Login' },
  LOGOUT:      { icon: LogOut,     color: 'text-gray-400',    bg: 'bg-gray-100 dark:bg-gray-800',         label: 'Logout' },
  CLAIM_SALES: { icon: CheckCircle,color: 'text-[#B2AC88]',   bg: 'bg-[#B2AC88]/15 dark:bg-[#9A9475]/30', label: 'Claim Penjualan' },
  IMPORT_SALES:{ icon: Upload,     color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/50',       label: 'Import Data' },
  UNCLAIM_SALE:{ icon: RotateCcw,  color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/50',     label: 'Unclaim Penjualan' },
  DELETE_SALE: { icon: Trash2,     color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/50',         label: 'Hapus Penjualan' },
  CREATE_CREW: { icon: UserPlus,   color: 'text-[#E14227]',   bg: 'bg-[#F0EAD6] dark:bg-[#B8321E]/30',   label: 'Tambah Crew' },
  DELETE_CREW: { icon: UserMinus,  color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/50',         label: 'Hapus Crew' },
  CREATE_GROUP:{ icon: FolderPlus, color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-950/50',   label: 'Tambah Group' },
  DELETE_GROUP:{ icon: Trash2,     color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/50',         label: 'Hapus Group' },
}

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted', label: action }
}

// ─── Time grouping ──────────────────────────────────────
function getTimeGroup(dateStr: string): TimeGroup {
  const wib = getWIBDate()
  const todayStart = new Date(wib.getFullYear(), wib.getMonth(), wib.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const entryDate = new Date(dateStr)
  if (entryDate >= todayStart) return 'today'
  if (entryDate >= yesterdayStart) return 'yesterday'
  return 'older'
}

function getTimeGroupLabel(group: TimeGroup): string {
  switch (group) {
    case 'today': return 'Hari Ini'
    case 'yesterday': return 'Kemarin'
    case 'older': return 'Lebih Lama'
  }
}

// ─── Single notification entry ──────────────────────────
function NotificationEntry({ entry, isRead, onRead }: {
  entry: ActivityLogEntry
  isRead: boolean
  onRead: () => void
}) {
  const config = getActionConfig(entry.action)
  const Icon = config.icon
  const count = entry.details?.count as number | undefined

  return (
    <div
      onClick={onRead}
      className={`flex items-start gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors duration-150 cursor-pointer active:bg-muted/60 hover:bg-muted/40 ${!isRead ? 'bg-[#F0EAD6]/30 dark:bg-[#B8321E]/8' : ''}`}
    >
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <p className={`text-[11px] sm:text-xs leading-relaxed line-clamp-2 ${!isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
            {entry.description || entry.action}
          </p>
          {!isRead && (
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#E14227] flex-shrink-0 mt-1.5 sm:mt-1" />
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
          <span className="text-[9px] sm:text-[10px] text-muted-foreground/70">{timeAgo(entry.createdAt)}</span>
          {entry.adminName && entry.adminName !== 'Sistem' && (
            <>
              <span className="text-muted-foreground/20 sm:text-muted-foreground/30">·</span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground/70">{entry.adminName}</span>
            </>
          )}
          {entry.crewName && (
            <>
              <span className="text-muted-foreground/20 sm:text-muted-foreground/30">·</span>
              <span className="text-[9px] sm:text-[10px] font-medium text-[#B8321E] dark:text-[#F07050] truncate max-w-[100px] sm:max-w-none">{entry.crewName}</span>
            </>
          )}
        </div>
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="mt-1 sm:mt-1.5 text-[8px] sm:text-[9px] px-1.5 py-0 h-3.5 sm:h-4 font-semibold">
            {count} data
          </Badge>
        )}
      </div>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────
export default function NotificationCenter({ notificationCount, bellSwingTrigger }: NotificationCenterProps) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellSwingKey = useRef(0)

  // Portal: wait for client mount
  useEffect(() => { setMounted(true) }, [])

  // Track bell swing trigger
  useEffect(() => {
    if (bellSwingTrigger) bellSwingKey.current++
  }, [bellSwingTrigger])

  // Fetch activity logs
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const r = await safeFetch('/api/activity-log?limit=20')
      const d = await r.json()
      if (Array.isArray(d)) setLogs(d)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  // Auto-refresh when panel opens
  useEffect(() => {
    if (isOpen) fetchLogs()
  }, [isOpen, fetchLogs])

  // Desktop only: close dropdown on outside click
  useEffect(() => {
    if (!isOpen || isMobile) return
    function handleClick(e: PointerEvent) {
      const target = e.target as Node
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        bellRef.current && !bellRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    // Delay listener slightly to avoid the opening click triggering immediate close
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleClick)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('pointerdown', handleClick)
    }
  }, [isOpen, isMobile])

  // Prevent body scroll when mobile sheet is open
  useEffect(() => {
    if (!isOpen || !isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen, isMobile])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  const close = useCallback(() => setIsOpen(false), [])

  const handleMarkAllRead = () => {
    setReadIds(new Set(logs.map(l => l.id)))
    toast.success('Semua notifikasi ditandai dibaca', { duration: 2000 })
  }

  const markRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const unreadCount = useMemo(() => logs.filter(l => !readIds.has(l.id)).length, [logs, readIds])

  const groupedLogs = useMemo(() => {
    const groups: { group: TimeGroup; entries: ActivityLogEntry[] }[] = []
    let currentGroup: TimeGroup | null = null
    for (const log of logs) {
      const tg = getTimeGroup(log.createdAt)
      if (tg !== currentGroup) {
        currentGroup = tg
        groups.push({ group: tg, entries: [] })
      }
      groups[groups.length - 1].entries.push(log)
    }
    return groups
  }, [logs])

  const totalBadge = notificationCount + unreadCount

  // ─── Shared panel inner content ───────────────────────
  const panelInner = (
    <>
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#E14227] to-[#7D95B5] flex items-center justify-center shadow-md shadow-[#E14227]/20">
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">Notifikasi</h3>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 sm:px-2.5 text-[10px] sm:text-[11px] font-medium text-[#B8321E] dark:text-[#F07050] hover:text-[#B8321E]/80 dark:hover:text-[#F07050]/80 hover:bg-[#F0EAD6] dark:hover:bg-[#B8321E]/20 gap-1"
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {isMobile ? 'Baca Semua' : 'Tandai Semua Dibaca'}
          </Button>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
              <BellOff className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Tidak ada notifikasi</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">Aktivitas terbaru akan muncul di sini</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {groupedLogs.map(({ group, entries }) => (
              <div key={group}>
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-muted/30 sticky top-0 z-10">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {getTimeGroupLabel(group)}
                  </span>
                </div>
                {entries.map((entry) => (
                  <NotificationEntry
                    key={entry.id}
                    entry={entry}
                    isRead={readIds.has(entry.id)}
                    onRead={() => markRead(entry.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {logs.length > 0 && (
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-t border-border/50 bg-muted/20 flex-shrink-0">
          <button
            className="w-full flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#B8321E] dark:text-[#F07050] hover:text-[#B8321E]/80 dark:hover:text-[#F07050]/80 transition-colors py-1"
            onClick={() => toast.info('Fitur ini akan segera tersedia', { duration: 2000 })}
          >
            <ExternalLink className="w-3 sm:w-3.5 h-3.5" />
            Lihat Semua Notifikasi
          </button>
        </div>
      )}
    </>
  )

  // ─── Mobile panel (portaled to body to escape sticky header) ───
  const mobilePanel = mounted && isMobile && isOpen && createPortal(
    <AnimatePresence>
      <motion.div
        key="notif-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[9998] bg-black/40"
        onClick={close}
      />
      <motion.div
        key="notif-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[9999] bg-background dark:bg-[#1A1A1B] rounded-t-2xl shadow-2xl flex flex-col"
        style={{ height: 'min(85dvh, 600px)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {panelInner}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )

  return (
    <>
      {/* Bell Icon Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={bellRef}
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted transition-transform duration-200 hover:scale-105 relative"
            onClick={() => setIsOpen(prev => !prev)}
            aria-label="Notifikasi"
          >
            <motion.span
              key={bellSwingKey.current}
              className={bellSwingTrigger ? 'animate-bell-swing' : ''}
              initial={bellSwingTrigger ? false : undefined}
            >
              <Bell className={`w-4 h-4 transition-colors duration-200 ${totalBadge > 0 ? 'text-foreground' : 'text-muted-foreground'}`} />
            </motion.span>

            {totalBadge > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 z-20"
              >
                <span className="block w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#1A1A1B] animate-badge-pulse" />
              </motion.span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          <span>Notifikasi{totalBadge > 0 ? ` (${totalBadge})` : ''}</span>
        </TooltipContent>
      </Tooltip>

      {/* Mobile panel — portaled to body */}
      {mobilePanel}

      {/* Desktop dropdown — stays inside header (absolute positioning) */}
      {!isMobile && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              key="notif-dropdown"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-full mt-2 w-[380px] z-[60]"
            >
              <div className="glass-card rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
                {panelInner}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  )
}
