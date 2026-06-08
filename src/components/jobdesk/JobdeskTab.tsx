'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Briefcase, Plus, CalendarDays, ChevronLeft, ChevronRight, Clock, AlertTriangle,
  Users, CheckCircle2, Circle, PlayCircle, LayoutGrid, BarChart3, Filter,
  GripVertical, Trash2, Edit3, Shield, Star, CalendarClock, ArrowUpDown,
  X, ChevronDown, User, Building2, Target, MapPin,
} from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, isToday, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { getWIBDate, getWIBToday, safeFetch } from '@/lib/cms-utils'
import type { Group, Crew } from '@/lib/cms-types'

// ─── Types ────────────────────────────────────────────
export interface JobdeskItem {
  id: string
  title: string
  description: string | null
  date: string
  priority: 'regular' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed'
  order: number
  groupId: string | null
  group: { id: string; name: string; logo: string | null } | null
  crewId: string | null
  crew: { id: string; name: string; photo: string | null; employeeId: string } | null
  validatedByAdmin: boolean
  validatedBy: string | null
  validatedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface JobdeskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  validated: number
  urgent: number
  crewPerformance: Array<{ crewId: string | null; crewName: string; crewPhoto: string | null; totalTasks: number }>
}

interface JobdeskTabProps {
  isAdmin: boolean
}

// ─── Animation presets ────────────────────────────────
const fadeIn = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 } }
const stagger = { animate: { transition: { staggerChildren: 0.04 } } }

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', icon: Circle, dotColor: 'bg-slate-400' },
  in_progress: { label: 'Proses', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: PlayCircle, dotColor: 'bg-amber-500' },
  completed: { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: CheckCircle2, dotColor: 'bg-emerald-500' },
}

const priorityConfig = {
  regular: { label: 'Regular', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: Clock },
  urgent: { label: 'Urgent', color: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800', icon: AlertTriangle },
}

const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const monthNamesId = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function JobdeskTab({ isAdmin }: JobdeskTabProps) {
  // ─── State ─────────────────────────────────────────
  const [jobdesks, setJobdesks] = useState<JobdeskItem[]>([])
  const [stats, setStats] = useState<JobdeskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<Group[]>([])
  const [mgmtCrews, setMgmtCrews] = useState<Crew[]>([])
  const [view, setView] = useState<'calendar' | 'list' | 'performance'>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(getWIBToday())
  const [filterGroupId, setFilterGroupId] = useState<string>('')
  const [filterCrewId, setFilterCrewId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')

  // Add/Edit dialog state
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<JobdeskItem | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDate, setFormDate] = useState(getWIBToday())
  const [formPriority, setFormPriority] = useState<'regular' | 'urgent'>('regular')
  const [formGroupId, setFormGroupId] = useState<string>('')
  const [formCrewId, setFormCrewId] = useState<string>('')
  const [formSaving, setFormSaving] = useState(false)

  // Drag state
  const [draggedItem, setDraggedItem] = useState<JobdeskItem | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const dragCounterRef = useRef(0)

  // Date detail panel state (calendar view)
  const [showDateDetail, setShowDateDetail] = useState(false)

  // ─── Fetch data ────────────────────────────────────
  const fetchJobdesks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('dateFrom', format(startOfMonth(currentDate), 'yyyy-MM-dd'))
      params.set('dateTo', format(endOfMonth(currentDate), 'yyyy-MM-dd'))
      if (filterGroupId) params.set('groupId', filterGroupId)
      if (filterCrewId) params.set('crewId', filterCrewId)
      if (filterStatus) params.set('status', filterStatus)
      if (filterPriority) params.set('priority', filterPriority)

      const r = await safeFetch(`/api/jobdesk?${params}`)
      const d = await r.json()
      if (Array.isArray(d)) setJobdesks(d)
      else toast.error(d.error || 'Gagal memuat jobdesk')
    } catch { toast.error('Gagal memuat jobdesk') }
    finally { setLoading(false) }
  }, [currentDate, filterGroupId, filterCrewId, filterStatus, filterPriority])

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('dateFrom', format(startOfMonth(currentDate), 'yyyy-MM-dd'))
      params.set('dateTo', format(endOfMonth(currentDate), 'yyyy-MM-dd'))
      if (filterGroupId) params.set('groupId', filterGroupId)

      const r = await safeFetch(`/api/jobdesk/stats?${params}`)
      const d = await r.json()
      if (d && !d.error) setStats(d)
    } catch { /* silent */ }
  }, [currentDate, filterGroupId])

  useEffect(() => {
    fetchJobdesks()
    fetchStats()
  }, [fetchJobdesks, fetchStats])

  // ─── Fetch groups & crews for dropdowns (public endpoints — no auth needed) ───
  const groupsCrewsLoaded = useRef(false)
  useEffect(() => {
    if (groupsCrewsLoaded.current) return
    groupsCrewsLoaded.current = true
    safeFetch('/api/jobdesk/groups')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setGroups(d) })
      .catch(() => {})
    safeFetch('/api/jobdesk/crews')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setMgmtCrews(d) })
      .catch(() => {})
  }, [])

  // ─── Computed data ─────────────────────────────────
  const calendarDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  const jobdesksByDate = useMemo(() => {
    const map = new Map<string, JobdeskItem[]>()
    for (const j of jobdesks) {
      const list = map.get(j.date) || []
      list.push(j)
      map.set(j.date, list)
    }
    // Sort each date's items by order
    for (const [, list] of map) {
      list.sort((a, b) => a.order - b.order)
    }
    return map
  }, [jobdesks])

  const selectedDateJobdesks = useMemo(() => {
    return jobdesksByDate.get(selectedDate) || []
  }, [jobdesksByDate, selectedDate])

  const filteredCrews = useMemo(() => {
    if (!formGroupId) return mgmtCrews
    return mgmtCrews.filter(c => c.groupId === formGroupId || c.group?.id === formGroupId)
  }, [mgmtCrews, formGroupId])

  // ─── CRUD handlers ─────────────────────────────────
  const openAddDialog = (date?: string) => {
    setEditingItem(null)
    setFormTitle('')
    setFormDescription('')
    setFormDate(date || selectedDate)
    setFormPriority('regular')
    setFormGroupId('')
    setFormCrewId('')
    setShowDialog(true)
  }

  const openEditDialog = (item: JobdeskItem) => {
    setEditingItem(item)
    setFormTitle(item.title)
    setFormDescription(item.description || '')
    setFormDate(item.date)
    setFormPriority(item.priority as 'regular' | 'urgent')
    setFormGroupId(item.groupId || '')
    setFormCrewId(item.crewId || '')
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim()) { toast.error('Judul harus diisi'); return }
    setFormSaving(true)
    try {
      const body = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        date: formDate,
        priority: formPriority,
        status: editingItem?.status || 'pending',
        groupId: formGroupId || null,
        crewId: formCrewId || null,
      }
      const method = editingItem ? 'PUT' : 'POST'
      const url = editingItem ? '/api/jobdesk' : '/api/jobdesk'
      const payload = editingItem ? { id: editingItem.id, ...body } : body

      const r = await safeFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(editingItem ? 'Jobdesk diperbarui' : 'Jobdesk ditambahkan')
      setShowDialog(false)
      fetchJobdesks()
      fetchStats()
    } catch { toast.error('Gagal menyimpan jobdesk') }
    finally { setFormSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const r = await safeFetch(`/api/jobdesk?id=${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Jobdesk dihapus')
      fetchJobdesks()
      fetchStats()
    } catch { toast.error('Gagal menghapus jobdesk') }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const r = await safeFetch('/api/jobdesk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      fetchJobdesks()
      fetchStats()
    } catch { toast.error('Gagal mengubah status') }
  }

  // Public status change — crew & admin can change status via /api/jobdesk/status
  const handleStatusChangePublic = async (id: string, status: string) => {
    try {
      const r = await safeFetch('/api/jobdesk/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      const label = status === 'pending' ? 'Pending' : status === 'in_progress' ? 'Dalam Proses' : 'Selesai'
      toast.success(`Status diubah ke ${label}`)
      fetchJobdesks()
      fetchStats()
    } catch { toast.error('Gagal mengubah status') }
  }

  // Admin validation handler
  const handleValidate = async (id: string, validated: boolean) => {
    try {
      const r = await safeFetch('/api/jobdesk/validate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, validated }),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(validated ? 'Jobdesk divalidasi admin' : 'Validasi dibatalkan')
      fetchJobdesks()
      fetchStats()
    } catch { toast.error('Gagal memvalidasi jobdesk') }
  }

  // Drag & drop: reorder within same date
  const handleReorder = async (reorderedItems: JobdeskItem[]) => {
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      order: index,
    }))
    try {
      await safeFetch('/api/jobdesk/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates }),
      })
    } catch { /* silent */ }
  }

  // Drag to different date
  const handleDragToDate = async (item: JobdeskItem, targetDate: string) => {
    try {
      const r = await safeFetch('/api/jobdesk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, date: targetDate }),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(`Jobdesk dipindahkan ke ${format(parseISO(targetDate), 'dd MMM', { locale: idLocale })}`)
      fetchJobdesks()
      fetchStats()
    } catch { toast.error('Gagal memindahkan jobdesk') }
  }

  // ─── Calendar navigation ───────────────────────────
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(getWIBToday()) }
  const goToPrev = () => setCurrentDate(prev => subMonths(prev, 1))
  const goToNext = () => setCurrentDate(prev => addMonths(prev, 1))

  // ─── Render ────────────────────────────────────────
  const todayStr = getWIBToday()

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ═══ HEADER ═══ */}
      <motion.div {...fadeIn} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#E14227]" />
            Jobdesk Harian
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Kelola tugas harian crew dengan kalender interaktif</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-muted/60 rounded-lg p-0.5">
            {[
              { val: 'calendar' as const, icon: CalendarDays, label: 'Kalender' },
              { val: 'list' as const, icon: LayoutGrid, label: 'List' },
              { val: 'performance' as const, icon: BarChart3, label: 'Performa' },
            ].map(v => (
              <button
                key={v.val}
                onClick={() => setView(v.val)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === v.val
                    ? 'bg-white dark:bg-[#2A2A2B] shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <v.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
          <Button
            onClick={() => openAddDialog()}
            className="bg-[#E14227] hover:bg-[#B8321E] text-white shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Tambah</span>
          </Button>
        </div>
      </motion.div>

      {/* ═══ STATS CARDS ═══ */}
      {stats && (
        <motion.div
          {...stagger}
          className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3"
        >
          {[
            { label: 'Total', value: stats.total, color: 'from-slate-500 to-slate-600', bg: 'bg-slate-50 dark:bg-slate-900/40' },
            { label: 'Pending', value: stats.pending, color: 'from-slate-400 to-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/30' },
            { label: 'Proses', value: stats.inProgress, color: 'from-amber-400 to-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            { label: 'Selesai', value: stats.completed, color: 'from-emerald-400 to-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { label: 'Divalidasi', value: stats.validated, color: 'from-[#E14227] to-[#B8321E]', bg: 'bg-[#E14227]/5 dark:bg-[#E14227]/10' },
            { label: 'Urgent', value: stats.urgent, color: 'from-red-500 to-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
          ].map((s) => (
            <motion.div key={s.label} {...fadeIn} className={`${s.bg} rounded-xl p-3 border border-border/50`}>
              <div className="text-[10px] text-muted-foreground font-medium mb-1">{s.label}</div>
              <div className="text-lg sm:text-xl font-bold tabular-nums">{s.value}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ═══ FILTER BAR ═══ */}
      <motion.div {...fadeIn} className="flex flex-wrap items-center gap-2 bg-card rounded-xl border border-border/50 p-3 shadow-sm">
        <Select value={filterGroupId} onValueChange={v => setFilterGroupId(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
            <Building2 className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Semua Zoning" />
          </SelectTrigger>
          <SelectContent className="z-[101]">
            <SelectItem value="__all__">Semua Zoning</SelectItem>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCrewId} onValueChange={v => setFilterCrewId(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs">
            <User className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Semua Crew" />
          </SelectTrigger>
          <SelectContent className="z-[101]">
            <SelectItem value="__all__">Semua Crew</SelectItem>
            {mgmtCrews.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={v => setFilterStatus(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="z-[101]">
            <SelectItem value="__all__">Semua Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">Dalam Proses</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
          </SelectContent>
        </Select>

        {(filterGroupId || filterCrewId || filterStatus || filterPriority) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => {
            setFilterGroupId('')
            setFilterCrewId('')
            setFilterStatus('')
            setFilterPriority('')
          }}>
            <X className="w-3 h-3 mr-1" /> Reset
          </Button>
        )}
      </motion.div>

      {/* ═══ CALENDAR NAVIGATION ═══ */}
      {(view === 'calendar' || view === 'list') && (
        <motion.div {...fadeIn} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-sm font-bold min-w-[140px] text-center">
              {monthNamesId[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={goToToday}>
            Hari Ini
          </Button>
        </motion.div>
      )}

      {/* ═══ CALENDAR VIEW ═══ */}
      {view === 'calendar' && (
        <div className="space-y-4">
          <motion.div {...fadeIn} className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
              {dayNamesShort.map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayJobdesks = jobdesksByDate.get(dateStr) || []
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isSelected = dateStr === selectedDate
                const isTodayDate = isToday(day)

                return (
                  <motion.div
                    key={dateStr}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`relative border-r border-b border-border/30 last:border-r-0 min-h-[80px] sm:min-h-[120px] transition-colors overflow-hidden ${
                      isSelected ? 'bg-[#E14227]/5 dark:bg-[#E14227]/10' : ''
                    } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                    onClick={() => { setSelectedDate(dateStr); setShowDateDetail(true) }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      dragCounterRef.current++
                      setDragOverDate(dateStr)
                    }}
                    onDragLeave={() => {
                      dragCounterRef.current--
                      if (dragCounterRef.current <= 0) {
                        dragCounterRef.current = 0
                        setDragOverDate(null)
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      dragCounterRef.current = 0
                      setDragOverDate(null)
                      if (draggedItem && dateStr !== draggedItem.date) {
                        handleDragToDate(draggedItem, dateStr)
                      }
                      setDraggedItem(null)
                    }}
                  >
                    {/* Drag over indicator */}
                    {dragOverDate === dateStr && (
                      <div className="absolute inset-0 bg-[#E14227]/10 dark:bg-[#E14227]/20 border-2 border-dashed border-[#E14227]/40 rounded z-10 pointer-events-none" />
                    )}

                    {/* Date number + zoning logos row */}
                    <div className="flex items-center justify-between px-1.5 py-1">
                      <span className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isTodayDate ? 'bg-[#E14227] text-white' : ''
                      } ${isSelected && !isTodayDate ? 'bg-[#E14227]/20 text-[#E14227] dark:bg-[#E14227]/30 dark:text-[#F07050]' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      {/* Zoning logos for this date */}
                      <div className="flex items-center -space-x-1">
                        {Array.from(new Map(dayJobdesks.filter(j => j.group?.logo).map(j => [j.group!.id, j.group!.logo]))).map(([gId, gLogo]) => (
                          <img
                            key={gId}
                            src={gLogo}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover border border-white dark:border-[#2A2A2B] bg-muted"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Task items (show max 2 to make room for logos) */}
                    <div className="px-1 space-y-0.5 overflow-hidden">
                      {dayJobdesks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          draggable={isAdmin}
                          onDragStart={(e) => {
                            setDraggedItem(task)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onClick={(e) => { e.stopPropagation(); if (isAdmin) openEditDialog(task) }}
                          className={`group ${isAdmin ? 'cursor-pointer' : 'cursor-default'} rounded-md px-1.5 py-0.5 text-[10px] font-medium truncate transition-all hover:shadow-sm border ${
                            task.priority === 'urgent'
                              ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'
                              : 'bg-white dark:bg-[#2A2A2B] border-border/40 text-foreground'
                          } ${task.validatedByAdmin ? 'ring-1 ring-emerald-400/50' : ''}`}
                        >
                          <div className="flex items-center gap-1">
                            {/* Zoning logo on task item */}
                            {task.group?.logo ? (
                              <img
                                src={task.group.logo}
                                alt={task.group.name || ''}
                                className="w-3.5 h-3.5 rounded-full object-cover shrink-0 border border-border/40"
                              />
                            ) : (
                              <Building2 className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                            )}
                            <span className="truncate flex-1">{task.title}</span>
                            {task.priority === 'urgent' && <AlertTriangle className="w-2.5 h-2.5 text-red-500 shrink-0" />}
                          </div>
                        </div>
                      ))}
                      {dayJobdesks.length > 2 && (
                        <div className="text-[9px] text-muted-foreground px-1 font-medium">
                          +{dayJobdesks.length - 2} lagi
                        </div>
                      )}
                    </div>

                    {/* Add button — only admin can add from calendar cell */}
                    {isAdmin && isCurrentMonth && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openAddDialog(dateStr) }}
                        className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-muted/60 hover:bg-[#E14227] hover:text-white text-muted-foreground flex items-center justify-center opacity-70 hover:opacity-100 active:bg-[#E14227] active:text-white transition-all sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* ═══ DATE DETAIL PANEL — show when a date is clicked ═══ */}
          <AnimatePresence>
            {showDateDetail && selectedDate && (
              <motion.div
                key={selectedDate}
                initial={{ opacity: 0, y: 12, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -12, height: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden"
              >
                {/* Detail header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-[#E14227]" />
                    <h3 className="text-sm font-bold">
                      {format(parseISO(selectedDate), 'EEEE, d MMMM yyyy', { locale: idLocale })}
                    </h3>
                    {isToday(parseISO(selectedDate)) && (
                      <Badge className="text-[9px] h-4 bg-[#E14227] text-white border-none">Hari ini</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5">
                      {selectedDateJobdesks.length} tugas
                    </Badge>
                    <button
                      onClick={() => setShowDateDetail(false)}
                      className="w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Detail body */}
                <div className="p-4">
                  {selectedDateJobdesks.length === 0 ? (
                    <div className="text-center py-8">
                      <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
                      <p className="text-sm text-muted-foreground">Tidak ada jobdesk untuk tanggal ini</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 h-7 text-xs"
                        onClick={() => openAddDialog(selectedDate)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Tambah Jobdesk
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateJobdesks.map(item => {
                        const sCfg = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending
                        const pCfg = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.regular
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${
                              item.priority === 'urgent'
                                ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30'
                                : 'bg-muted/30 border-border/40'
                            } ${item.validatedByAdmin ? 'ring-1 ring-emerald-400/40' : ''}`}
                          >
                            {/* Left: zoning logo + status */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              {item.group?.logo ? (
                                <img src={item.group.logo} alt={item.group.name || ''} className="w-9 h-9 rounded-lg object-cover border border-border/40" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                                  <Building2 className="w-4 h-4 text-muted-foreground/50" />
                                </div>
                              )}
                              <span className={`w-2 h-2 rounded-full ${sCfg.dotColor}`} title={sCfg.label} />
                            </div>

                            {/* Center: content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold truncate">{item.title}</h4>
                                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${pCfg.color}`}>
                                  {pCfg.label}
                                </Badge>
                                {item.validatedByAdmin && (
                                  <Badge className="text-[9px] px-1.5 py-0 h-4 shrink-0 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                    <Shield className="w-2.5 h-2.5 mr-0.5" /> Validasi
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{item.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                {/* Zoning info */}
                                {item.group && (
                                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    {item.group.name}
                                  </span>
                                )}
                                {/* Crew info */}
                                {item.crew && (
                                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    {item.crew.name}
                                    {item.crew.employeeId && (
                                      <span className="text-[9px] text-muted-foreground/60">({item.crew.employeeId})</span>
                                    )}
                                  </span>
                                )}
                                {/* Status buttons — clickable to change */}
                                <div className="flex items-center gap-1">
                                  {(['pending', 'in_progress', 'completed'] as const).map(s => {
                                    const sc = statusConfig[s]
                                    const isActive = item.status === s
                                    return (
                                      <button
                                        key={s}
                                        onClick={() => handleStatusChangePublic(item.id, s)}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                                          isActive
                                            ? sc.color
                                            : 'border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground'
                                        }`}
                                        title={`Ubah ke ${sc.label}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dotColor}`} />
                                        {sc.label}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Right: actions (admin only) */}
                            {isAdmin && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => openEditDialog(item)}
                                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Hapus jobdesk ini?')) handleDelete(item.id)
                                  }}
                                  className="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ═══ LIST VIEW ═══ */}
      {view === 'list' && (
        <motion.div {...fadeIn} className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : selectedDateJobdesks.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Tidak ada jobdesk untuk tanggal ini</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => openAddDialog(selectedDate)}
              >
                <Plus className="w-4 h-4 mr-1" /> Tambah Jobdesk
              </Button>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={selectedDateJobdesks}
              onReorder={(newOrder) => {
                setJobdesks(prev => {
                  const newMap = new Map(prev.map(j => [j.id, j]))
                  // Remove old items for this date
                  const others = prev.filter(j => j.date !== selectedDate)
                  // Add reordered items
                  return [...others, ...newOrder.map((item, idx) => ({ ...item, order: idx }))]
                })
                handleReorder(newOrder)
              }}
              className="space-y-2"
            >
              {selectedDateJobdesks.map(item => (
                <JobdeskCard
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onValidate={handleValidate}
                />
              ))}
            </Reorder.Group>
          )}
        </motion.div>
      )}

      {/* ═══ PERFORMANCE VIEW ═══ */}
      {view === 'performance' && (
        <motion.div {...fadeIn} className="space-y-4">
          {/* Crew Performance */}
          <div className="bg-card rounded-2xl border border-border/50 p-4 sm:p-6">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-[#E14227]" />
              Performa Crew — {monthNamesId[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            {stats && stats.crewPerformance.length > 0 ? (
              <div className="space-y-3">
                {stats.crewPerformance.map((cp, i) => (
                  <div key={cp.crewId || i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{cp.crewName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{cp.totalTasks} tugas</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((cp.totalTasks / Math.max(stats.crewPerformance[0]?.totalTasks || 1, 1)) * 100, 100)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-[#E14227] to-[#E6BAA3] rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Belum ada data performa untuk bulan ini
              </div>
            )}
          </div>

          {/* Group Summary */}
          <div className="bg-card rounded-2xl border border-border/50 p-4 sm:p-6">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-amber-500" />
              Ringkasan per Zoning
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {groups.map(g => {
                const groupJobdesks = jobdesks.filter(j => j.groupId === g.id)
                const groupCompleted = groupJobdesks.filter(j => j.status === 'completed').length
                const pct = groupJobdesks.length > 0 ? Math.round((groupCompleted / groupJobdesks.length) * 100) : 0
                return (
                  <div key={g.id} className="bg-muted/30 rounded-xl p-3 border border-border/30">
                    <div className="text-xs font-semibold mb-1 truncate">{g.name}</div>
                    <div className="text-lg font-bold tabular-nums">{groupJobdesks.length}</div>
                    <div className="text-[10px] text-muted-foreground">{groupCompleted} selesai ({pct}%)</div>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ ADD/EDIT DIALOG ═══ */}
      <Dialog modal={false} open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[480px] dialog-enhanced">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingItem ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingItem ? 'Edit Jobdesk' : 'Tambah Jobdesk Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Judul Tugas *</label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Contoh: Cek stok display"
                className="h-9"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Deskripsi</label>
              <Textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Detail tugas (opsional)"
                className="min-h-[60px] text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Tanggal *</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Prioritas</label>
                <Select value={formPriority} onValueChange={v => setFormPriority(v as 'regular' | 'urgent')}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]">
                    <SelectItem value="regular">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-blue-500" /> Regular
                      </span>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-red-500" /> Urgent
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Group/Zoning */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Zoning / Group</label>
                <Select value={formGroupId} onValueChange={v => {
                  setFormGroupId(v === '__none__' ? '' : v)
                  setFormCrewId('') // reset crew when group changes
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pilih Zoning" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]">
                    <SelectItem value="__none__">Tanpa Zoning</SelectItem>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Crew */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Crew</label>
                <Select value={formCrewId} onValueChange={v => setFormCrewId(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Pilih Crew" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]">
                    <SelectItem value="__none__">Belum ditugaskan</SelectItem>
                    {filteredCrews.length === 0 && formGroupId && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">Tidak ada crew di zoning ini</div>
                    )}
                    {filteredCrews.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-1.5">
                          {c.name}
                          {c.group && <span className="text-muted-foreground text-[10px]">· {c.group.name}</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="h-8">Batal</Button>
            <Button
              onClick={handleSave}
              disabled={formSaving || !formTitle.trim()}
              className="h-8 bg-[#E14227] hover:bg-[#B8321E] text-white"
            >
              {formSaving ? 'Menyimpan...' : editingItem ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Jobdesk Card Component ──────────────────────────
function JobdeskCard({
  item,
  isAdmin,
  onEdit,
  onDelete,
  onStatusChange,
  onValidate,
}: {
  item: JobdeskItem
  isAdmin: boolean
  onEdit: (item: JobdeskItem) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  onValidate: (id: string, validated: boolean) => void
}) {
  const sConfig = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending
  const pConfig = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.regular
  const StatusIcon = sConfig.icon

  return (
    <Reorder.Item
      value={item}
      className={`bg-card rounded-xl border border-border/50 p-3 shadow-sm hover:shadow-md transition-all ${isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle — admin only */}
        {isAdmin && (
          <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0 cursor-grab" />
        )}

        {/* Status indicator — admin can click to cycle, crew just sees it */}
        {isAdmin ? (
          <button
            onClick={() => {
              const nextStatus = item.status === 'pending' ? 'in_progress' : item.status === 'in_progress' ? 'completed' : 'pending'
              onStatusChange(item.id, nextStatus)
            }}
            className="mt-0.5 shrink-0"
            title={`Status: ${sConfig.label} — klik untuk ubah`}
          >
            <StatusIcon className={`w-5 h-5 ${sConfig.dotColor.replace('bg-', 'text-')}`} />
          </button>
        ) : (
          <div className="mt-0.5 shrink-0" title={`Status: ${sConfig.label}`}>
            <StatusIcon className={`w-5 h-5 ${sConfig.dotColor.replace('bg-', 'text-')}`} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold truncate">{item.title}</h4>
            {/* Priority Badge */}
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${pConfig.color}`}>
              {pConfig.label}
            </Badge>
            {/* Admin Validated Badge */}
            {item.validatedByAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="text-[9px] px-1.5 py-0 h-4 shrink-0 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    <Shield className="w-2.5 h-2.5 mr-0.5" /> Valid
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Divalidasi oleh {item.validatedBy} {item.validatedAt ? `pada ${new Date(item.validatedAt).toLocaleString('id-ID')}` : ''}</span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">{item.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Group */}
            {item.group && (
              <span className="tag-chip tag-chip-dept">
                <Building2 className="w-2.5 h-2.5" />
                {item.group.name}
              </span>
            )}
            {/* Crew */}
            {item.crew && (
              <span className="tag-chip tag-chip-payment">
                <User className="w-2.5 h-2.5" />
                {item.crew.name}
              </span>
            )}
            {/* Date */}
            <span className="text-[10px] text-muted-foreground">
              <CalendarClock className="w-2.5 h-2.5 inline mr-0.5" />
              {format(parseISO(item.date), 'dd MMM', { locale: idLocale })}
            </span>
          </div>
        </div>

        {/* Actions — admin only */}
        {isAdmin && (
        <div className="flex items-center gap-1 shrink-0">
          {/* Admin Validation Checkbox */}
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onValidate(item.id, !item.validatedByAdmin)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    item.validatedByAdmin
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                  }`}
                  title="Validasi admin"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {item.validatedByAdmin ? 'Batalkan validasi' : 'Validasi sebagai selesai (Admin)'}
              </TooltipContent>
            </Tooltip>
          )}

          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(item)}>
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => onDelete(item.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        )}
      </div>
    </Reorder.Item>
  )
}
