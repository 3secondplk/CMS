'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  ClipboardList, Plus, Clock, CheckCircle2, Circle, AlertCircle, User,
  CalendarDays, ChevronLeft, ChevronRight, BarChart3, Settings,
  Trash2, Edit3, Eye, TrendingUp, Timer, Users, FileText, Loader2,
  X, Award, Target, Zap, ArrowRight, CalendarIcon, ArrowUpDown,
  CheckSquare, Square, Download, ChevronsLeft, ChevronsRight, ListTodo, Sparkles,
  Printer, RefreshCw, Power, PowerOff, Search, Filter, Trophy, Flame, Hourglass,
  GripVertical,
} from 'lucide-react'
import { safeFetch } from '@/lib/cms-utils'
import type { Jobdesk, JobdeskSummary, JobdeskGroupStat, ShiftSetting, CalendarDayData, Group, Crew } from '@/lib/cms-types'
import { getWIBToday, getWIBDate, monthNames, dayNames, fmtNum } from '@/lib/cms-utils'
import { CircularProgress } from '@/lib/cms-utils'
import { fadeIn, stagger } from '@/lib/cms-utils'

// ─── JobdeskTemplate type (inline) ────────────────────
interface JobdeskTemplate {
  id: string
  title: string
  description: string | null
  groupId: string
  crewId: string | null
  priority: string
  active: boolean
  group?: Group
  crew?: Crew | null
}

// ─── Priority Config ────────────────────────────────────
const priorityConfig = {
  high: { label: 'Tinggi', color: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800', icon: AlertCircle, dot: 'bg-red-500' },
  medium: { label: 'Sedang', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: Clock, dot: 'bg-amber-500' },
  low: { label: 'Rendah', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: Circle, dot: 'bg-emerald-500' },
} as const

// ─── Status Config ──────────────────────────────────────
const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Circle, dot: 'bg-gray-400' },
  in_progress: { label: 'Proses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400', icon: Clock, dot: 'bg-blue-500' },
  completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', icon: CheckCircle2, dot: 'bg-emerald-500' },
} as const

interface JobdeskTabProps {
  groups: Group[]
  crews: Crew[]
}

export default function JobdeskTab({ groups, crews }: JobdeskTabProps) {
  const todayStr = getWIBToday()

  // Time ago helper
  const getTimeAgo = (dateStr: string): string => {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diffMs = now - then
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'baru saja'
    if (diffMin < 60) return `${diffMin}m lalu`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}j lalu`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}h lalu`
    return `${Math.floor(diffDay / 7)}mgg lalu`
  }
  const [wibNow, setWibNow] = useState(getWIBDate())
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'priority' | 'status' | 'title' | 'verification'>('priority')
  const [activeView, setActiveView] = useState<'today' | 'history'>('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')

  // ─── Group Selection Gate & Crew Identity ──────────────
  const [groupPicked, setGroupPicked] = useState<Group | null>(null)
  const [crewName, setCrewName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('jobdesk-crew-name') || ''
    }
    return ''
  })
  const [showCrewInput, setShowCrewInput] = useState(false)
  const [crewInputValue, setCrewInputValue] = useState('')

  // Persist crew name to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (crewName) {
        localStorage.setItem('jobdesk-crew-name', crewName)
      } else {
        localStorage.removeItem('jobdesk-crew-name')
      }
    }
  }, [crewName])

  // Auto-set selectedGroupId when groupPicked changes
  useEffect(() => {
    if (groupPicked) {
      setSelectedGroupId(groupPicked.id)
    } else {
      setSelectedGroupId(null)
    }
  }, [groupPicked])

  // Handle group selection — show crew input if no name saved
  const handleSelectGroup = (group: Group) => {
    setGroupPicked(group)
    if (!crewName) {
      setCrewInputValue('')
      setShowCrewInput(true)
    }
  }

  // Handle crew name submission
  const handleCrewNameSubmit = () => {
    const name = crewInputValue.trim()
    if (!name) {
      toast.error('Masukkan nama kamu terlebih dahulu')
      return
    }
    setCrewName(name)
    setShowCrewInput(false)
  }

  // Handle switch group (back to gate)
  const handleSwitchGroup = () => {
    setGroupPicked(null)
    setSelectedGroupId(null)
    setActiveView('today')
    setSearchQuery('')
    setStatusFilter('all')
    setSelectedCrewId(null)
    setSelectedIds(new Set())
  }

  // Handle logout (clear crew name)
  const handleLogout = () => {
    setCrewName('')
    setGroupPicked(null)
    setSelectedGroupId(null)
  }

  // Live WIB clock — update every 30s
  useEffect(() => {
    const interval = setInterval(() => setWibNow(getWIBDate()), 30000)
    return () => clearInterval(interval)
  }, [])

  // Listen for Ctrl+N custom event from parent
  useEffect(() => {
    const handler = () => openCreateForm(selectedGroupId || undefined)
    window.addEventListener('jobdesk:create', handler)
    return () => window.removeEventListener('jobdesk:create', handler)
  }, [selectedGroupId])

  // Data state
  const [jobdesks, setJobdesks] = useState<Jobdesk[]>([])
  const [summary, setSummary] = useState<JobdeskSummary | null>(null)
  const [groupStats, setGroupStats] = useState<JobdeskGroupStat[]>([])
  const [loading, setLoading] = useState(true)

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(wibNow.getFullYear(), wibNow.getMonth(), 1))
  const [calendarData, setCalendarData] = useState<CalendarDayData[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Jobdesk | null>(null)
  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'medium' as 'low' | 'medium' | 'high',
    crewId: '', groupId: '', status: 'pending' as 'pending' | 'in_progress' | 'completed',
    verificationPercent: 0, notes: '',
  })
  const [formSaving, setFormSaving] = useState(false)

  // Quick-add inline state
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddSaving, setQuickAddSaving] = useState(false)

  // Activity timeline
  const [recentActivity, setRecentActivity] = useState<{
    id: string; title: string; action: string; actionIcon: string; status: string;
    priority: string; groupName: string; crewName: string | null;
    verificationPercent: number; verifiedByAdmin: string | null;
    updatedAt: string; jobDate: string
  }[]>([])

  // Weekly stats
  const [weeklyStats, setWeeklyStats] = useState<{
    weeklyData: { date: string; dayLabel: string; dayShort: string; total: number; completed: number; inProgress: number; pending: number; avgVerification: number; highPriority: number }[]
    totalAll: number; completedAll: number; avgRate: number
  } | null>(null)

  // Detail dialog
  const [detailItem, setDetailItem] = useState<CalendarDayData | null>(null)

  // Shift settings
  const [showShiftSettings, setShowShiftSettings] = useState(false)
  const [shiftSettings, setShiftSettings] = useState<ShiftSetting | null>(null)
  const [shiftForm, setShiftForm] = useState({ shiftStart: '08:00', shiftEnd: '17:00' })
  const [shiftSaving, setShiftSaving] = useState(false)

  // Crew trend sparkline data
  const [crewTrendData, setCrewTrendData] = useState<Record<string, { date: string; completed: number; total: number; avgVerification: number }[]>>({})

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)

  // Drag-and-drop reorder state
  const [dragItemId, setDragItemId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Drag-and-drop handlers for jobdesk reorder
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragItemId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const dragId = e.dataTransfer.getData('text/plain')
    if (!dragId || dragId === targetId) {
      setDragItemId(null)
      setDragOverId(null)
      return
    }
    // Reorder visually — move the dragged item before the drop target
    setJobdesks(prev => {
      const items = [...prev]
      const dragIdx = items.findIndex(j => j.id === dragId)
      const dropIdx = items.findIndex(j => j.id === targetId)
      if (dragIdx === -1 || dropIdx === -1) return prev
      const [moved] = items.splice(dragIdx, 1)
      items.splice(dropIdx, 0, moved)
      return items
    })
    setDragItemId(null)
    setDragOverId(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragItemId(null)
    setDragOverId(null)
  }, [])

  // Print dialog
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const printAreaRef = useRef<HTMLDivElement>(null)

  // Inject print CSS
  useEffect(() => {
    const id = 'jobdesk-print-css'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `@media print { body * { visibility: hidden; } #jobdesk-print-area, #jobdesk-print-area * { visibility: visible; } #jobdesk-print-area { position: absolute; left: 0; top: 0; width: 100%; } }`
    document.head.appendChild(style)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  // Template state
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<JobdeskTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateForm, setTemplateForm] = useState({
    title: '', description: '', priority: 'medium' as 'low' | 'medium' | 'high',
    groupId: '', crewId: '',
  })
  const [templateSaving, setTemplateSaving] = useState(false)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      const r = await safeFetch('/api/jobdesk/templates')
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      setTemplates(d.templates || [])
    } catch { toast.error('Gagal memuat template') }
    finally { setTemplatesLoading(false) }
  }, [])

  // Open template dialog
  const openTemplateDialog = () => {
    setShowTemplateForm(false)
    setEditingTemplateId(null)
    setTemplateForm({ title: '', description: '', priority: 'medium', groupId: '', crewId: '' })
    setShowTemplates(true)
    fetchTemplates()
  }

  // Save template
  const handleSaveTemplate = async () => {
    if (!templateForm.title.trim()) { toast.error('Judul template wajib diisi'); return }
    if (!templateForm.groupId) { toast.error('Pilih group terlebih dahulu'); return }
    setTemplateSaving(true)
    try {
      const body = editingTemplateId ? { id: editingTemplateId, ...templateForm } : templateForm
      const r = await safeFetch('/api/jobdesk/templates', {
        method: editingTemplateId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(editingTemplateId ? 'Template diperbarui' : 'Template berhasil dibuat')
      setShowTemplateForm(false)
      setEditingTemplateId(null)
      fetchTemplates()
    } catch { toast.error('Gagal menyimpan template') }
    finally { setTemplateSaving(false) }
  }

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    try {
      const r = await safeFetch(`/api/jobdesk/templates?id=${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Template dihapus')
      fetchTemplates()
    } catch { toast.error('Gagal menghapus template') }
  }

  // Toggle template active
  const handleToggleTemplate = async (id: string, active: boolean) => {
    try {
      const r = await safeFetch('/api/jobdesk/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !active }),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      fetchTemplates()
    } catch { toast.error('Gagal mengubah status template') }
  }

  // Auto-generate jobdesk from templates
  const handleAutoGenerate = async () => {
    setAutoGenerating(true)
    try {
      const r = await safeFetch('/api/jobdesk/auto-generate', { method: 'POST' })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(d.message || `${d.count || 0} jobdesk berhasil di-generate`)
      fetchJobdesks(selectedDate, selectedGroupId)
    } catch { toast.error('Gagal auto-generate jobdesk') }
    finally { setAutoGenerating(false) }
  }

  // ─── Fetch Jobdesk Data ──────────────────────────────
  const fetchJobdesks = useCallback(async (date?: string, groupId?: string | null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ date: date || selectedDate })
      if (groupId) params.set('groupId', groupId)
      const r = await safeFetch(`/api/jobdesk?${params}`)
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      setJobdesks(d.jobdesks || [])
      setSummary(d.summary || null)
      setGroupStats(d.groupStats || [])
    } catch { toast.error('Gagal memuat jobdesk') }
    finally { setLoading(false) }
  }, [selectedDate])

  // Fetch calendar history
  const fetchCalendar = useCallback(async (month: string) => {
    setCalendarLoading(true)
    try {
      const params = new URLSearchParams({ month })
      if (selectedGroupId) params.set('groupId', selectedGroupId)
      const r = await safeFetch(`/api/jobdesk/history?${params}`)
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      setCalendarData(d.calendarData || [])
    } catch { toast.error('Gagal memuat history') }
    finally { setCalendarLoading(false) }
  }, [selectedGroupId])

  // Fetch weekly stats
  const fetchWeeklyStats = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedGroupId) params.set('groupId', selectedGroupId)
      const r = await safeFetch(`/api/jobdesk/weekly?${params}`)
      const d = await r.json()
      if (!d.error) setWeeklyStats(d)
    } catch { /* silent */ }
  }, [selectedGroupId])

  // Fetch recent activity
  const fetchActivity = useCallback(async () => {
    try {
      const r = await safeFetch('/api/jobdesk/activity?limit=8')
      const d = await r.json()
      if (!d.error) setRecentActivity(d.activities || [])
    } catch { /* silent */ }
  }, [])

  // Fetch crew trend data for sparklines
  const fetchCrewTrend = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedGroupId) params.set('groupId', selectedGroupId)
      const r = await safeFetch(`/api/jobdesk/crew-trend?${params}`)
      const d = await r.json()
      if (!d.error && d.crewTrends) {
        const map: Record<string, { date: string; completed: number; total: number; avgVerification: number }[]> = {}
        for (const ct of d.crewTrends) {
          map[ct.crewId] = ct.data
        }
        setCrewTrendData(map)
      }
    } catch { /* silent */ }
  }, [selectedGroupId])

  // Fetch shift settings
  const fetchShiftSettings = useCallback(async () => {
    try {
      const r = await safeFetch('/api/settings/shift')
      const d = await r.json()
      if (d.settings) {
        setShiftSettings(d.settings)
        setShiftForm({ shiftStart: d.settings.shiftStart, shiftEnd: d.settings.shiftEnd })
      }
    } catch { /* silent */ }
  }, [])

  // Load data on mount and when date/group changes
  useEffect(() => {
    if (!groupPicked) return
    fetchJobdesks(selectedDate, selectedGroupId)
    fetchShiftSettings()
    fetchWeeklyStats()
    fetchActivity()
    fetchCrewTrend()
  }, [groupPicked, selectedDate, selectedGroupId, fetchJobdesks, fetchShiftSettings, fetchWeeklyStats, fetchActivity, fetchCrewTrend])

  // Load calendar when switching to history view
  useEffect(() => {
    if (activeView === 'history') {
      const monthStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`
      fetchCalendar(monthStr)
    }
  }, [activeView, calendarMonth, fetchCalendar])

  // ─── Form Handlers ───────────────────────────────────
  const openCreateForm = (groupId?: string) => {
    setEditItem(null)
    setFormData({ title: '', description: '', priority: 'medium', crewId: '', groupId: groupId || '', status: 'pending', verificationPercent: 0, notes: '' })
    setShowForm(true)
  }

  const openEditForm = (item: Jobdesk) => {
    setEditItem(item)
    setFormData({
      title: item.title,
      description: item.description || '',
      priority: item.priority as 'low' | 'medium' | 'high',
      crewId: item.crewId || '',
      groupId: item.groupId,
      status: item.status as 'pending' | 'in_progress' | 'completed',
      verificationPercent: item.verificationPercent,
      notes: item.notes || '',
    })
    setShowForm(true)
  }

  const handleSaveForm = async () => {
    if (!formData.title.trim()) { toast.error('Judul jobdesk wajib diisi'); return }
    if (!formData.groupId) { toast.error('Pilih group terlebih dahulu'); return }
    // Duplicate detection
    const dup = jobdesks.find(j =>
      j.groupId === formData.groupId &&
      j.title.toLowerCase().trim() === formData.title.trim().toLowerCase() &&
      j.jobDate === selectedDate &&
      (!editItem || j.id !== editItem.id)
    )
    if (dup) { toast.error('Jobdesk dengan judul yang sama sudah ada di group ini untuk tanggal ini'); return }

    setFormSaving(true)
    try {
      if (editItem) {
        // Update
        const r = await safeFetch('/api/jobdesk', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editItem.id, ...formData }),
        })
        const d = await r.json()
        if (d.error) { toast.error(d.error); return }
        toast.success('Jobdesk diperbarui')
      } else {
        // Create
        const r = await safeFetch('/api/jobdesk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const d = await r.json()
        if (d.error) { toast.error(d.error); return }
        toast.success('Jobdesk berhasil dibuat')
      }
      setShowForm(false)
      fetchJobdesks(selectedDate, selectedGroupId)
      fetchActivity()
    } catch { toast.error('Gagal menyimpan jobdesk') }
    finally { setFormSaving(false) }
  }

  // Quick-add handler: create jobdesk inline with just title + auto-assign group/priority
  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim()) return
    const qGroupId = selectedGroupId || (groups.length > 0 ? groups[0].id : '')
    // Duplicate detection
    const dup = jobdesks.find(j =>
      j.groupId === qGroupId &&
      j.title.toLowerCase().trim() === quickAddTitle.trim().toLowerCase() &&
      j.jobDate === selectedDate
    )
    if (dup) { toast.error('Jobdesk dengan judul yang sama sudah ada di group ini untuk tanggal ini'); return }
    setQuickAddSaving(true)
    try {
      const r = await safeFetch('/api/jobdesk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickAddTitle.trim(),
          description: '',
          priority: 'medium',
          groupId: selectedGroupId || (groups.length > 0 ? groups[0].id : ''),
          crewId: '',
          status: 'pending',
          verificationPercent: 0,
          notes: '',
        }),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Jobdesk cepat ditambahkan!')
      setQuickAddTitle('')
      setShowQuickAdd(false)
      fetchJobdesks(selectedDate, selectedGroupId)
    } catch { toast.error('Gagal menambah jobdesk') }
    finally { setQuickAddSaving(false) }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const r = await safeFetch('/api/jobdesk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Status diperbarui')
      fetchJobdesks(selectedDate, selectedGroupId)
    } catch { toast.error('Gagal memperbarui status') }
  }

  const handleVerification = async (id: string, percent: number) => {
    try {
      const r = await safeFetch('/api/jobdesk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, verificationPercent: percent }),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(`Verifikasi diperbarui: ${percent}%`)
      fetchJobdesks(selectedDate, selectedGroupId)
    } catch { toast.error('Gagal memperbarui verifikasi') }
  }

  const handleDelete = async (id: string, name: string) => {
    setDeleteId(id)
    setDeleteName(name)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      const r = await safeFetch(`/api/jobdesk?id=${deleteId}`, { method: 'DELETE' })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Jobdesk dihapus')
      setDeleteId(null)
      fetchJobdesks(selectedDate, selectedGroupId)
    } catch { toast.error('Gagal menghapus') }
  }

  // ─── Shift Settings Handler ──────────────────────────
  const handleSaveShift = async () => {
    setShiftSaving(true)
    try {
      const r = await safeFetch('/api/settings/shift', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftForm),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success('Pengaturan shift diperbarui')
      setShiftSettings(d.settings)
      setShowShiftSettings(false)
    } catch { toast.error('Gagal menyimpan pengaturan') }
    finally { setShiftSaving(false) }
  }

  // ─── Bulk Action Handler ────────────────────────────
  const handleBulkAction = async (action: 'completed' | 'in_progress' | 'delete', status?: string) => {
    if (selectedIds.size === 0) return
    setBulkSaving(true)
    try {
      const ids = Array.from(selectedIds)
      if (action === 'delete') {
        for (const id of ids) {
          await safeFetch(`/api/jobdesk?id=${id}`, { method: 'DELETE' })
        }
        toast.success(`${ids.length} jobdesk dihapus`)
      } else {
        const r = await safeFetch('/api/jobdesk/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, action: 'update_status', status }),
        })
        const d = await r.json()
        if (d.error) { toast.error(d.error); return }
        toast.success(`${ids.length} jobdesk diperbarui ke ${status === 'completed' ? 'Selesai' : 'Proses'}`)
      }
      setSelectedIds(new Set())
      fetchJobdesks(selectedDate, selectedGroupId)
    } catch { toast.error('Gagal melakukan aksi bulk') }
    finally { setBulkSaving(false) }
  }

  // ─── Date Navigation Helper ───────────────────────────
  const navigateDate = (direction: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + direction)
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setSelectedDate(newDate)
    setActiveView('today')
    setSelectedIds(new Set())
  }

  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return `${dayNames[date.getDay()]}, ${d} ${monthNames[date.getMonth()]} ${y}`
  }

  // ─── Check if shift has ended (stable memo) ─────────
  const isShiftEnded = useMemo(() => {
    if (!shiftSettings) return false
    const nowMinutes = wibNow.getHours() * 60 + wibNow.getMinutes()
    const [eh, em] = shiftSettings.shiftEnd.split(':').map(Number)
    return nowMinutes >= eh * 60 + em
  }, [wibNow, shiftSettings])

  // ─── Filter & Sort jobdesks ──────────────────────────
  const filteredJobdesks = selectedGroupId
    ? jobdesks.filter(j => j.groupId === selectedGroupId)
    : jobdesks

  const displayJobdesks = useMemo(() => {
    let items = filteredJobdesks

    // Status filter
    if (statusFilter !== 'all') {
      items = items.filter(j => j.status === statusFilter)
    }

    // Crew filter
    if (selectedCrewId) {
      items = items.filter(j => j.crewId === selectedCrewId)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.description && j.description.toLowerCase().includes(q)) ||
        (j.crew && j.crew.name.toLowerCase().includes(q)) ||
        (j.notes && j.notes.toLowerCase().includes(q))
      )
    }

    // Sort
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const statusOrder = { pending: 0, in_progress: 1, completed: 2 }

    items = [...items].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
        case 'status':
          return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
        case 'title':
          return a.title.localeCompare(b.title)
        case 'verification':
          return b.verificationPercent - a.verificationPercent
        default:
          return 0
      }
    })
    return items
  }, [filteredJobdesks, selectedCrewId, sortBy, searchQuery, statusFilter])

  // ─── Crew Performance Stats ──────────────────────────
  const crewPerformance = useMemo(() => {
    const crewMap = new Map<string, { crewId: string; name: string; total: number; completed: number; avgVerification: number }>()
    filteredJobdesks.forEach(j => {
      if (!j.crewId || !j.crew) return
      const existing = crewMap.get(j.crewId) || { crewId: j.crewId, name: j.crew.name, total: 0, completed: 0, avgVerification: 0 }
      existing.total++
      if (j.status === 'completed') existing.completed++
      crewMap.set(j.crewId, existing)
    })
    return Array.from(crewMap.values())
      .map(c => ({ ...c, avgVerification: Math.round(filteredJobdesks.filter(j => j.crewId && crewMap.get(j.crewId)?.name === c.name).reduce((s, j) => s + j.verificationPercent, 0) / c.total) }))
      .sort((a, b) => b.completed - a.completed || b.avgVerification - a.avgVerification)
  }, [filteredJobdesks])

  // ─── Shift Countdown ──────────────────────────────────
  const shiftCountdown = useMemo(() => {
    if (!shiftSettings) return null
    const nowMinutes = wibNow.getHours() * 60 + wibNow.getMinutes()
    const [sh, sm] = shiftSettings.shiftStart.split(':').map(Number)
    const [eh, em] = shiftSettings.shiftEnd.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em

    if (nowMinutes < startMins) {
      // Before shift starts
      const diff = startMins - nowMinutes
      return { status: 'before' as const, hours: Math.floor(diff / 60), minutes: diff % 60 }
    } else if (nowMinutes < endMins) {
      // During shift
      const diff = endMins - nowMinutes
      return { status: 'active' as const, hours: Math.floor(diff / 60), minutes: diff % 60 }
    } else {
      return { status: 'ended' as const, hours: 0, minutes: 0 }
    }
  }, [wibNow, shiftSettings])

  // Keyboard shortcuts for bulk operations (Ctrl+A, Delete, Escape)
  // Placed AFTER displayJobdesks useMemo to avoid TDZ
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return

      // Ctrl/Cmd + A: Select all visible jobdesks
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        if (activeView === 'today' && displayJobdesks.length > 0) {
          setSelectedIds(new Set(displayJobdesks.map(j => j.id)))
          toast.info(`${displayJobdesks.length} jobdesk dipilih`, { duration: 2000 })
        }
        return
      }

      // Delete/Backspace: Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault()
        if (confirm(`Hapus ${selectedIds.size} jobdesk yang dipilih?`)) {
          handleBulkAction('delete')
        }
        return
      }

      // Escape: Deselect all
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set())
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeView, displayJobdesks, selectedIds])

  // Shift start/end toast notification
  const prevShiftEnded = useRef(false)
  useEffect(() => {
    if (!shiftSettings) return
    const ended = isShiftEnded
    if (ended && !prevShiftEnded.current) {
      toast('⏰ Shift telah berakhir!', {
        description: `Lihat summary akhir shift (${shiftSettings.shiftStart}–${shiftSettings.shiftEnd})`,
        duration: 6000,
      })
    }
    if (!ended && prevShiftEnded.current && shiftCountdown?.status === 'active') {
      toast('🚀 Shift baru dimulai!', {
        description: `Shift aktif ${shiftSettings.shiftStart}–${shiftSettings.shiftEnd}. Selamat bekerja!`,
        duration: 4000,
      })
    }
    prevShiftEnded.current = ended
  }, [wibNow, shiftSettings, isShiftEnded, shiftCountdown])

  // ─── Render ───────────────────────────────────────────
  // STEP 1: Group Selection Gate
  if (!groupPicked) {
    return (
      <TabsContent value="jobdesk" className="mt-4 sm:mt-6 pb-24 md:pb-8">
        <motion.div {...fadeIn} className="flex flex-col items-center justify-center py-12 gap-8">
          {/* Animated Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-3"
          >
            <div className="relative inline-flex">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E14227] via-[#D4956B] to-[#E14227] bg-[length:200%_200%] animate-[gradient-shift_3s_ease-in-out_infinite] flex items-center justify-center shadow-xl shadow-[#E14227]/25">
                <ClipboardList className="w-10 h-10 text-white" />
              </div>
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-400/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </motion.div>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#E14227] via-[#D4956B] to-[#E14227] bg-clip-text text-transparent bg-[length:200%_200%] animate-[gradient-shift_3s_ease-in-out_infinite]">
              Pilih Grup Kamu
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Pilih group untuk mulai mengelola jobdesk harian
            </p>
          </motion.div>

          {/* Group Cards Grid */}
          <motion.div
            {...stagger}
            className="w-full max-w-3xl grid grid-cols-2 md:grid-cols-3 gap-4 px-4"
          >
            {groups.map((group, idx) => {
              const crewCount = group.crews?.length || group.crewCount || 0
              return (
                <motion.button
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  {...fadeIn}
                  transition={{ delay: idx * 0.08 }}
                  whileHover={{ y: -4, scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                  whileTap={{ scale: 0.97 }}
                  className="relative group/card bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-lg hover:shadow-2xl hover:shadow-[#E14227]/10 transition-all duration-300 overflow-hidden text-left"
                >
                  {/* Glassmorphism shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/5 dark:via-transparent dark:to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
                  {/* Top accent bar */}
                  <div className="h-1 bg-gradient-to-r from-[#E14227] via-[#D4956B] to-[#E14227]" />
                  <div className="p-5 relative">
                    {/* Group icon / logo */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E14227]/10 to-[#D4956B]/10 dark:from-[#E14227]/20 dark:to-[#D4956B]/20 flex items-center justify-center mb-3 group-hover/card:from-[#E14227]/20 group-hover/card:to-[#D4956B]/20 transition-colors">
                      {group.logo ? (
                        <img src={group.logo} alt={group.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-[#E14227]" />
                      )}
                    </div>
                    <h3 className="font-bold text-foreground text-sm mb-1.5 truncate">{group.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-2 py-0 bg-[#E14227]/5 text-[#E14227] border-[#E14227]/20 font-medium">
                        <Users className="w-3 h-3 mr-1" />
                        {crewCount} crew
                      </Badge>
                    </div>
                    {/* Arrow hint */}
                    <div className="absolute top-5 right-4 opacity-0 group-hover/card:opacity-100 transition-all duration-300 translate-x-1 group-hover/card:translate-x-0">
                      <ArrowRight className="w-4 h-4 text-[#E14227]" />
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>

          {/* Subtle footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[11px] text-muted-foreground/50"
          >
            {groups.length} group tersedia
          </motion.p>
        </motion.div>
      </TabsContent>
    )
  }

  // STEP 2: Crew Name Input Dialog (overlay)
  const crewNameDialog = showCrewInput && (
    <Dialog open={showCrewInput} onOpenChange={(open) => { if (!open) { setShowCrewInput(false); if (!crewName) setGroupPicked(null) } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E14227] to-[#D4956B] flex items-center justify-center shadow-md">
              <User className="w-4 h-4 text-white" />
            </div>
            Masuk sebagai Crew
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Masukkan nama kamu untuk melanjutkan ke <strong>{groupPicked?.name}</strong>
          </p>
          <Input
            placeholder="Masukkan nama kamu..."
            value={crewInputValue}
            onChange={e => setCrewInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCrewNameSubmit() }}
            autoFocus
            className="h-11 text-base focus:ring-2 focus:ring-[#E14227]/30 border-border/60"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setShowCrewInput(false); if (!crewName) setGroupPicked(null) }}>Batal</Button>
          <Button onClick={handleCrewNameSubmit} className="bg-[#E14227] hover:bg-[#E14227]/90 text-white">
            Masuk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <TabsContent value="jobdesk" className="mt-4 sm:mt-6 pb-24 md:pb-8">
    <motion.div {...fadeIn} className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E14227] to-[#D4956B] flex items-center justify-center shadow-md shadow-[#E14227]/20">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">Jobdesk Harian</h2>
              {/* Group badge */}
              <Badge className="bg-[#E14227]/10 text-[#E14227] border-[#E14227]/20 text-xs px-2.5 py-0.5 font-semibold">
                {groupPicked?.logo ? (
                  <img src={groupPicked.logo} alt="" className="w-4 h-4 rounded mr-1 object-cover" />
                ) : (
                  <Users className="w-3.5 h-3.5 mr-1" />
                )}
                {groupPicked?.name}
              </Badge>
              {/* Crew name badge */}
              <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-medium bg-muted/50">
                <User className="w-3 h-3 mr-1" />
                {crewName}
              </Badge>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#E14227]/10 text-[#E14227] font-semibold tabular-nums">
                {String(wibNow.getHours()).padStart(2, '0')}:{String(wibNow.getMinutes()).padStart(2, '0')} WIB
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{dayNames[wibNow.getDay()]}, {wibNow.getDate()} {monthNames[wibNow.getMonth()]} {wibNow.getFullYear()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Ganti Grup button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleSwitchGroup} className="gap-1.5 text-xs">
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                Ganti Grup
              </Button>
            </TooltipTrigger>
            <TooltipContent>Kembali ke pilihan grup</TooltipContent>
          </Tooltip>
          {/* Keluar button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 text-xs text-muted-foreground">
                <X className="w-3.5 h-3.5" />
                Keluar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ganti nama crew</TooltipContent>
          </Tooltip>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            variant={activeView === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('today')}
            className={activeView === 'today' ? 'bg-[#E14227] hover:bg-[#E14227]/90 text-white' : ''}
          >
            <ClipboardList className="w-4 h-4 mr-1.5" />
            Hari Ini
          </Button>
          <Button
            variant={activeView === 'history' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('history')}
            className={activeView === 'history' ? 'bg-[#E14227] hover:bg-[#E14227]/90 text-white' : ''}
          >
            <CalendarDays className="w-4 h-4 mr-1.5" />
            History
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setShowShiftSettings(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pengaturan Jam Shift</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setShowPrintPreview(true)}>
                <Printer className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print Preview</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => {
                const params = new URLSearchParams({ date: selectedDate })
                if (selectedGroupId) params.set('groupId', selectedGroupId)
                window.open(`/api/jobdesk/export?${params}`, '_blank')
              }}>
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
          <Button
            size="sm"
            onClick={() => openCreateForm(selectedGroupId || undefined)}
            className="bg-[#E14227] hover:bg-[#E14227]/90 text-white shadow-md shadow-[#E14227]/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Jobdesk
          </Button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl px-4 py-2.5 border shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)} className="h-8 w-8 p-0">
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#E14227]" />
          <span className={`text-sm font-semibold ${selectedDate === todayStr ? 'text-[#E14227]' : 'text-foreground'}`}>
            {formatDateDisplay(selectedDate)}
          </span>
          {selectedDate === todayStr && (
            <Badge className="bg-[#E14227]/10 text-[#E14227] border-[#E14227]/20 text-[10px] px-1.5 py-0">
              Hari Ini
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedDate !== todayStr && (
            <Button variant="outline" size="sm" onClick={() => { setSelectedDate(todayStr); setActiveView('today'); setSelectedIds(new Set()) }} className="h-7 text-xs mr-1">
              Hari Ini
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigateDate(1)} className="h-8 w-8 p-0">
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search + Status Filter + Crew Filter + Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto flex-wrap">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari jobdesk..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-[160px] h-8 text-xs pl-8 pr-2"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {([
              { value: 'all', label: 'Semua', dot: 'bg-gray-400' },
              { value: 'pending', label: 'Pending', dot: 'bg-gray-400' },
              { value: 'in_progress', label: 'Proses', dot: 'bg-blue-500' },
              { value: 'completed', label: 'Selesai', dot: 'bg-emerald-500' },
            ] as const).map(s => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                  statusFilter === s.value
                    ? 'bg-white dark:bg-gray-800 shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </button>
            ))}
          </div>
          {/* Crew Filter */}
          <Select value={selectedCrewId || '__all__'} onValueChange={v => setSelectedCrewId(v === '__all__' ? null : v)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Semua Crew" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Semua Crew</SelectItem>
              {(selectedGroupId
                ? crews.filter(c => c.groupId === selectedGroupId)
                : crews
              ).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Sort */}
          <Select value={sortBy} onValueChange={v => setSortBy(v as 'priority' | 'status' | 'title' | 'verification')}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Prioritas</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="title">Judul A-Z</SelectItem>
              <SelectItem value="verification">Verifikasi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Shift Info Bar with Countdown */}
      {shiftSettings && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
          isShiftEnded
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800'
            : shiftCountdown?.status === 'before'
              ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/50 dark:to-slate-900/50 border-gray-200 dark:border-gray-700'
              : 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isShiftEnded ? 'bg-amber-100 dark:bg-amber-900/50' :
              shiftCountdown?.status === 'before' ? 'bg-gray-100 dark:bg-gray-800' :
              'bg-emerald-100 dark:bg-emerald-900/50'
            }`}>
              {isShiftEnded ? <Award className="w-4 h-4 text-amber-600" /> :
               shiftCountdown?.status === 'before' ? <Hourglass className="w-4 h-4 text-gray-500" /> :
               <Timer className="w-4 h-4 text-emerald-600" />}
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">
                Shift: {shiftSettings.shiftStart} — {shiftSettings.shiftEnd}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {isShiftEnded ? (
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-amber-200 dark:border-amber-700 text-[10px] px-2 py-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Shift Berakhir — Lihat Summary
                  </Badge>
                ) : shiftCountdown?.status === 'before' ? (
                  <span className="text-[10px] text-muted-foreground">
                    Shift dimulai dalam <span className="font-semibold text-foreground">{shiftCountdown.hours > 0 ? `${shiftCountdown.hours}j ` : ''}{shiftCountdown.minutes}m</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 text-[10px] px-2 py-0">
                      <Clock className="w-3 h-3 mr-1 animate-pulse" />
                      Dalam Shift
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Sisa <span className="font-semibold text-emerald-700 dark:text-emerald-400">{shiftCountdown.hours > 0 ? `${shiftCountdown.hours}j ` : ''}{shiftCountdown.minutes}m</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {shiftCountdown?.status === 'active' && !isShiftEnded && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="flex items-center gap-1 tabular-nums">
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{String(shiftCountdown.hours).padStart(2, '0')}</span>
                  <span className="text-emerald-500">:</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{String(shiftCountdown.minutes).padStart(2, '0')}</span>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">tersisa</span>
              </div>
              <CircularProgress
                value={(() => {
                  const [sh, sm] = shiftSettings.shiftStart.split(':').map(Number)
                  const [eh, em] = shiftSettings.shiftEnd.split(':').map(Number)
                  const total = (eh * 60 + em) - (sh * 60 + sm)
                  const elapsed = total - (shiftCountdown.hours * 60 + shiftCountdown.minutes)
                  return Math.min(100, Math.round((elapsed / total) * 100))
                })()}
                size={36}
                strokeWidth={3}
              />
            </div>
          )}
        </div>
      )}

      {/* ─── TODAY VIEW ───────────────────────────────── */}
      {activeView === 'today' && (
        <motion.div {...stagger} className="space-y-4">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Total */}
              <motion.div {...fadeIn} transition={{ delay: 0.1 + 0 * 0.08 }} whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }} className="bg-white dark:bg-gray-900 rounded-xl p-4 border shadow-sm border-l-[3px] border-l-[#E14227] overflow-hidden relative card-shine-hover group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#E14227]/5 to-transparent rounded-bl-3xl transition-all group-hover:from-[#E14227]/10" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Total</span>
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E14227] to-[#B8321E] shadow-md flex items-center justify-center">
                    <ClipboardList className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums animate-count-pop">{summary.total}</p>
                <span className="text-[10px] text-muted-foreground">tugas hari ini</span>
              </motion.div>

              {/* Selesai */}
              <motion.div {...fadeIn} transition={{ delay: 0.1 + 1 * 0.08 }} whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }} className="bg-white dark:bg-gray-900 rounded-xl p-4 border shadow-sm border-l-[3px] border-l-emerald-500 overflow-hidden relative card-shine-hover group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-3xl transition-all group-hover:from-emerald-500/10" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Selesai</span>
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-600 tabular-nums animate-count-pop">{summary.completed}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Progress value={summary.total > 0 ? (summary.completed / summary.total) * 100 : 0} className="h-1 flex-1" />
                  <span className="text-[9px] font-medium text-muted-foreground">{summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%</span>
                </div>
              </motion.div>

              {/* Proses */}
              <motion.div {...fadeIn} transition={{ delay: 0.1 + 2 * 0.08 }} whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }} className="bg-white dark:bg-gray-900 rounded-xl p-4 border shadow-sm border-l-[3px] border-l-blue-500 overflow-hidden relative card-shine-hover group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-3xl transition-all group-hover:from-blue-500/10" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Proses</span>
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-md flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-600 tabular-nums animate-count-pop">{summary.inProgress}</p>
                <span className="text-[10px] text-muted-foreground">sedang dikerjakan</span>
              </motion.div>

              {/* Pending */}
              <motion.div {...fadeIn} transition={{ delay: 0.1 + 3 * 0.08 }} whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }} className="bg-white dark:bg-gray-900 rounded-xl p-4 border shadow-sm border-l-[3px] border-l-gray-400 overflow-hidden relative card-shine-hover group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-gray-400/5 to-transparent rounded-bl-3xl transition-all group-hover:from-gray-400/10" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Pending</span>
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 shadow-md flex items-center justify-center">
                    <Circle className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-500 tabular-nums animate-count-pop">{summary.pending}</p>
                <span className="text-[10px] text-muted-foreground">menunggu diproses</span>
              </motion.div>

              {/* Verifikasi Rate */}
              <motion.div {...fadeIn} transition={{ delay: 0.1 + 4 * 0.08 }} whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }} className="bg-white dark:bg-gray-900 rounded-xl p-4 border shadow-sm border-l-[3px] border-l-amber-500 overflow-hidden relative card-shine-hover group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-3xl transition-all group-hover:from-amber-500/10" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Verifikasi</span>
                  <CircularProgress
                    value={summary.avgVerification}
                    size={28}
                    strokeWidth={3}
                  />
                </div>
                <p className={`text-2xl font-bold tabular-nums animate-count-pop ${
                  summary.avgVerification >= 80 ? 'text-emerald-600' :
                  summary.avgVerification >= 50 ? 'text-amber-600' : 'text-gray-500'
                }`}>{summary.avgVerification}%</p>
                <span className="text-[10px] text-muted-foreground">rata-rata kualitas</span>
              </motion.div>
            </div>
          )}

          {/* Weekly Stats Mini Bar Chart */}
          {weeklyStats && weeklyStats.totalAll > 0 && (
            <motion.div {...fadeIn} className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                    <BarChart3 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Statistik 7 Hari Terakhir</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground">{weeklyStats.completedAll}/{weeklyStats.totalAll} selesai</span>
                  <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0 ${
                    weeklyStats.avgRate >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200' :
                    weeklyStats.avgRate >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {weeklyStats.avgRate}% rata-rata
                  </Badge>
                </div>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-end gap-2 h-24">
                  {weeklyStats.weeklyData.map((day, idx) => {
                    const maxTotal = Math.max(...weeklyStats.weeklyData.map(d => d.total), 1)
                    const barHeight = day.total > 0 ? Math.max(8, (day.total / maxTotal) * 80) : 4
                    const completedHeight = day.total > 0 ? (day.completed / day.total) * barHeight : 0
                    const isToday = idx === 6
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-semibold tabular-nums text-muted-foreground">{day.total}</span>
                        <div className="w-full relative rounded-t-md overflow-hidden bg-gray-100 dark:bg-gray-800" style={{ height: `${barHeight}px` }}>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${completedHeight}px` }}
                            transition={{ duration: 0.5, delay: idx * 0.05 }}
                            className={`absolute bottom-0 left-0 right-0 rounded-t-md ${
                              day.avgVerification >= 80 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' :
                              day.avgVerification >= 50 ? 'bg-gradient-to-t from-amber-500 to-amber-400' :
                              'bg-gradient-to-t from-red-400 to-red-300'
                            } ${isToday ? 'ring-1 ring-[#E14227]/30' : ''}`}
                          />
                        </div>
                        <span className={`text-[9px] font-medium ${isToday ? 'text-[#E14227] font-bold' : 'text-muted-foreground'}`}>
                          {day.dayShort}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                    <span className="text-[10px] text-muted-foreground">≥80% verification</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-amber-500" />
                    <span className="text-[10px] text-muted-foreground">≥50%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-red-400" />
                    <span className="text-[10px] text-muted-foreground">{'<'}50%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Shift Summary (shown when shift ended) */}
          {isShiftEnded && selectedGroupId && (
            <motion.div {...fadeIn} className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800 dark:text-amber-400">Summary Akhir Shift</h3>
              </div>
              {(() => {
                const gs = groupStats.find(g => g.groupId === selectedGroupId)
                if (!gs) return null
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Tugas</p>
                      <p className="text-lg font-bold">{gs.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Selesai</p>
                      <p className="text-lg font-bold text-emerald-600">{gs.completed} <span className="text-xs font-normal text-muted-foreground">/ {gs.total}</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Dalam Proses</p>
                      <p className="text-lg font-bold text-blue-600">{gs.inProgress}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Verifikasi Rata-rata</p>
                      <div className="flex items-center gap-2">
                        <CircularProgress value={gs.avgVerification} size={40} strokeWidth={4} showLabel />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          )}

          {/* ─── Crew Performance Leaderboard ──────────── */}
          {crewPerformance.length > 0 && (
            <motion.div {...fadeIn} className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
                    <Trophy className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Performa Crew</h3>
                </div>
                <Badge variant="outline" className="text-[10px] bg-muted/50">
                  {crewPerformance.length} crew aktif
                </Badge>
              </div>
              <div className="divide-y">
                {crewPerformance.slice(0, 5).map((crew, idx) => {
                  const rate = crew.total > 0 ? Math.round((crew.completed / crew.total) * 100) : 0
                  const trend = crewTrendData[crew.crewId]
                  // Sparkline: compute points from completed counts over 7 days
                  let sparkPoints = ''
                  let sparkFillPoints = ''
                  let isTrendingUp = false
                  if (trend && trend.length >= 2) {
                    const vals = trend.map(d => d.completed)
                    const maxVal = Math.max(...vals, 1)
                    const w = 40, h = 16, pad = 1
                    const points = vals.map((v, i) => {
                      const x = pad + (i / (vals.length - 1)) * (w - pad * 2)
                      const y = h - pad - (v / maxVal) * (h - pad * 2)
                      return { x, y }
                    })
                    sparkPoints = points.map(p => `${p.x},${p.y}`).join(' ')
                    sparkFillPoints = `${pad},${h - pad} ${sparkPoints} ${w - pad},${h - pad}`
                    isTrendingUp = vals[vals.length - 1] > vals[0]
                  }
                  return (
                    <div key={crew.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm' :
                        idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-sm' :
                        idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-sm' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{crew.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{crew.completed}/{crew.total} selesai</span>
                          {sparkPoints && (
                            <svg width="40" height="16" viewBox="0 0 40 16" className="flex-shrink-0">
                              <defs>
                                <linearGradient id={`sparkFill-${crew.crewId}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={isTrendingUp ? '#10b981' : '#ef4444'} stopOpacity="0.25" />
                                  <stop offset="100%" stopColor={isTrendingUp ? '#10b981' : '#ef4444'} stopOpacity="0.02" />
                                </linearGradient>
                              </defs>
                              <polygon
                                points={sparkFillPoints}
                                fill={`url(#sparkFill-${crew.crewId})`}
                              />
                              <polyline
                                points={sparkPoints}
                                fill="none"
                                stroke={isTrendingUp ? '#10b981' : '#ef4444'}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                          {idx === 0 && crew.completed > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] text-amber-600 font-medium">
                              <Flame className="w-2.5 h-2.5" /> Top Performer
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={rate} className="w-16 h-1.5" />
                        <span className={`text-xs font-semibold tabular-nums min-w-[32px] text-right ${
                          rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-gray-500'
                        }`}>{rate}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Recent Activity Timeline */}
          {recentActivity.length > 0 && (
            <motion.div {...fadeIn} className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-muted/30 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                    <Clock className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Aktivitas Terbaru</h3>
                </div>
                <Badge variant="outline" className="text-[10px] bg-muted/50">
                  {recentActivity.length} aktivitas
                </Badge>
              </div>
              <div className="divide-y">
                {recentActivity.slice(0, 6).map((act, idx) => {
                  const timeAgo = getTimeAgo(act.updatedAt)
                  return (
                    <div key={act.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        act.actionIcon === 'complete' ? 'bg-emerald-100 dark:bg-emerald-900/50' :
                        act.actionIcon === 'progress' ? 'bg-blue-100 dark:bg-blue-900/50' :
                        act.actionIcon === 'update' ? 'bg-amber-100 dark:bg-amber-900/50' :
                        'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {act.actionIcon === 'complete' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> :
                         act.actionIcon === 'progress' ? <Clock className="w-3 h-3 text-blue-600" /> :
                         act.actionIcon === 'update' ? <Edit3 className="w-3 h-3 text-amber-600" /> :
                         <Plus className="w-3 h-3 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{act.title}</span>
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 flex-shrink-0 ${
                            act.status === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' :
                            act.status === 'in_progress' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30' :
                            'bg-gray-50 text-gray-500 dark:bg-gray-800'
                          }`}>{act.action}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <span>{act.groupName}</span>
                          {act.crewName && <><span>•</span><span>{act.crewName}</span></>}
                          <span className="ml-auto text-[10px]">{timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Quick-Add Inline */}
          <motion.div {...fadeIn} className="space-y-2">
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#E14227] transition-colors group"
            >
              <div className="w-5 h-5 rounded-md border border-dashed border-muted-foreground/40 group-hover:border-[#E14227] group-hover:bg-[#E14227]/5 flex items-center justify-center transition-all">
                <Plus className="w-3 h-3" />
              </div>
              <span className="font-medium">Quick Add</span>
              <span className="text-[10px] text-muted-foreground/60">Ctrl+N</span>
            </button>
            <AnimatePresence>
              {showQuickAdd && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#E14227]/30 bg-[#E14227]/5">
                    <Input
                      placeholder="Tulis judul tugas, lalu tekan Enter..."
                      value={quickAddTitle}
                      onChange={e => setQuickAddTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd() }}
                      disabled={quickAddSaving}
                      className="flex-1 h-9 text-sm border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/60"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleQuickAdd}
                      disabled={quickAddSaving || !quickAddTitle.trim()}
                      className="bg-[#E14227] hover:bg-[#E14227]/90 text-white h-8 px-3 shadow-sm"
                    >
                      {quickAddSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                      Tambah
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowQuickAdd(false); setQuickAddTitle('') }}
                      className="h-8 text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 px-1">
                    Akan dibuat dengan prioritas Sedang di group {selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name || 'terpilih' : 'pertama'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Select All Toolbar + Jobdesk List */}
          <div className="space-y-3">
            {!loading && displayJobdesks.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    onClick={() => {
                      if (selectedIds.size === displayJobdesks.length) {
                        setSelectedIds(new Set())
                      } else {
                        setSelectedIds(new Set(displayJobdesks.map(j => j.id)))
                      }
                    }}
                    className="flex-shrink-0"
                  >
                    {selectedIds.size === displayJobdesks.length && displayJobdesks.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#E14227]" />
                    ) : selectedIds.size > 0 ? (
                      <div className="w-4 h-4 rounded border-2 border-[#E14227] bg-[#E14227]/20 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-[#E14227]">-</span>
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground/50" />
                    )}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Pilih Semua ({displayJobdesks.length}) <kbd className="ml-1 px-1 py-0 rounded bg-muted border border-border text-[9px] font-mono leading-none">⌘A</kbd>
                  </span>
                </label>
                {selectedIds.size > 0 && (
                  <span className="text-xs font-medium text-[#E14227]">{selectedIds.size} dipilih</span>
                )}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-white dark:bg-gray-900 rounded-xl p-4 border">
                    <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : displayJobdesks.length === 0 ? (
              selectedDate === todayStr ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center py-20 gap-6"
                >
                  {/* Animated floating icons */}
                  <div className="relative w-32 h-32">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E14227] to-[#D4956B] flex items-center justify-center shadow-lg shadow-[#E14227]/30"
                    >
                      <ListTodo className="w-8 h-8 text-white" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -6, 0], x: [0, 3, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                      className="absolute bottom-2 left-1 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30"
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -5, 0], x: [0, -3, 0] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                      className="absolute bottom-2 right-1 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-400/30"
                    >
                      <Sparkles className="w-5 h-5 text-white" />
                    </motion.div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-foreground">Mulai Catat Jobdesk Hari Ini</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Buat tugas untuk crew dan pantau progresnya secara real-time
                    </p>
                  </div>
                  <Button
                    onClick={() => openCreateForm(selectedGroupId || undefined)}
                    className="bg-[#E14227] hover:bg-[#E14227]/90 text-white shadow-md shadow-[#E14227]/20"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Buat Jobdesk Pertama
                  </Button>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <ClipboardList className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-foreground">Belum ada jobdesk</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedGroupId ? 'Tambahkan jobdesk untuk group ini' : 'Pilih group atau tambahkan jobdesk baru'}
                    </p>
                  </div>
                  <Button
                    onClick={() => openCreateForm(selectedGroupId || undefined)}
                    className="bg-[#E14227] hover:bg-[#E14227]/90 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Tambah Jobdesk
                  </Button>
                </div>
              )
            ) : (
              <AnimatePresence>
                {displayJobdesks.map((item, index) => (
                  <motion.div
                    key={item.id}
                    {...fadeIn}
                    transition={{ delay: index * 0.05 }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDrop={(e) => handleDrop(e, item.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white dark:bg-gray-900 rounded-xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-grab active:cursor-grabbing relative overflow-hidden animate-item-entrance ${
                      dragItemId === item.id ? 'opacity-50 scale-[0.98] shadow-lg ring-2 ring-[#E14227]/20' : ''
                    } ${
                      dragOverId === item.id && dragItemId !== item.id ? 'border-[#E14227] ring-1 ring-[#E14227]/30 bg-[#E14227]/5 -translate-y-1' : ''
                    } ${
                      item.status === 'completed' ? 'opacity-75' : ''
                    } ${
                      item.priority === 'high' ? 'border-l-[3px] border-l-red-500' :
                      item.priority === 'medium' ? 'border-l-[3px] border-l-amber-500' :
                      'border-l-[3px] border-l-emerald-400'
                    } ${
                      item.status === 'completed' ? 'border-emerald-200 dark:border-emerald-800' :
                      item.status === 'in_progress' ? 'border-blue-100 dark:border-blue-900' :
                      ''
                    }`}
                  >
                    {item.status === 'completed' && (
                      <div className="absolute top-2 right-2 animate-checkmark-overlay pointer-events-none">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-sm" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Drag handle */}
                          <div className="mt-1 flex-shrink-0 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          {/* Selection checkbox */}
                          <button
                            onClick={() => {
                              const next = new Set(selectedIds)
                              if (next.has(item.id)) {
                                next.delete(item.id)
                              } else {
                                next.add(item.id)
                              }
                              setSelectedIds(next)
                            }}
                            className="mt-0.5 flex-shrink-0"
                          >
                            {selectedIds.has(item.id) ? (
                              <CheckSquare className="w-4 h-4 text-[#E14227]" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors" />
                            )}
                          </button>
                          {/* Status indicator */}
                          <button
                            onClick={() => {
                              const nextStatus = item.status === 'pending' ? 'in_progress' : item.status === 'in_progress' ? 'completed' : 'pending'
                              handleUpdateStatus(item.id, nextStatus)
                            }}
                            className="mt-0.5 flex-shrink-0"
                          >
                            {item.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : item.status === 'in_progress' ? (
                              <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-semibold text-sm ${item.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {item.title}
                              </h4>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityConfig[item.priority].color}`}>
                                {priorityConfig[item.priority].label}
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusConfig[item.status].color}`}>
                                {statusConfig[item.status].label}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                            )}
                            {/* Crew & Group + metadata row */}
                            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                <Users className="w-3 h-3" />
                                {item.group.name}
                              </span>
                              {item.crew && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                  <User className="w-3 h-3" />
                                  {item.crew.name}
                                </span>
                              )}
                              {item.notes && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <FileText className="w-3 h-3" />
                                  Ada catatan
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Verification mini badge */}
                          <div className={`flex items-center gap-0.5 mr-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums ${
                            item.verificationPercent >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' :
                            item.verificationPercent >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            <Target className="w-3 h-3" />
                            {item.verificationPercent}%
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditForm(item)}>
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => handleDelete(item.id, item.title)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Hapus</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Verification Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">
                            Verifikasi{item.verifiedByAdmin ? ` oleh ${item.verifiedByAdmin.name}` : ''}
                          </span>
                          <span className="text-[10px] font-medium text-[#E14227]">{item.verificationPercent}%</span>
                        </div>
                        <Progress value={item.verificationPercent} className="h-1.5" />
                      </div>

                      {/* Notes */}
                      {item.notes && (
                        <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                          <p className="text-[11px] text-muted-foreground italic leading-relaxed">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Floating Bulk Action Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-2xl shadow-black/10 dark:shadow-black/40 px-5 py-3 flex items-center gap-3"
              >
                <div className="flex items-center gap-2 pr-3 border-r">
                  <div className="w-6 h-6 rounded-lg bg-[#E14227]/10 flex items-center justify-center">
                    <CheckSquare className="w-3.5 h-3.5 text-[#E14227]" />
                  </div>
                  <span className="text-sm font-bold text-foreground tabular-nums">{selectedIds.size}</span>
                  <span className="text-xs text-muted-foreground">dipilih</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkSaving}
                  onClick={() => handleBulkAction('completed', 'completed')}
                  className="h-8 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                >
                  {bulkSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Selesai
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkSaving}
                  onClick={() => handleBulkAction('in_progress', 'in_progress')}
                  className="h-8 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/30"
                >
                  {bulkSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                  Proses
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={bulkSaving}
                  onClick={() => handleBulkAction('delete')}
                  className="h-8 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                >
                  {bulkSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Hapus
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Batal
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── HISTORY VIEW (Calendar) ──────────────────── */}
      {activeView === 'history' && (
        <motion.div {...fadeIn} className="space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl p-4 border shadow-sm">
            <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="font-semibold text-foreground">
              {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalendarMonth(new Date(wibNow.getFullYear(), wibNow.getMonth(), 1))}
                className="h-7 text-xs mr-1"
              >
                Ke Bulan Ini
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border shadow-sm">
            {calendarLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#E14227]" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {/* Day headers */}
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
                {/* Calendar days */}
                {(() => {
                  const year = calendarMonth.getFullYear()
                  const month = calendarMonth.getMonth()
                  const firstDay = new Date(year, month, 1).getDay()
                  const daysInMonth = new Date(year, month + 1, 0).getDate()
                  const cells: React.ReactNode[] = []

                  // Empty cells for days before the 1st
                  for (let i = 0; i < firstDay; i++) {
                    cells.push(<div key={`empty-${i}`} className="aspect-square" />)
                  }

                  // Day cells
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayData = calendarData.find(d => d.date === dateStr)
                    const isToday = dateStr === todayStr
                    const completionRate = dayData && dayData.total > 0 ? (dayData.completed / dayData.total) * 100 : 0

                    // Heat-map color based on completion rate — smoother gradients
                    const heatColor = dayData
                      ? completionRate >= 80
                        ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-950/60 border-emerald-300 dark:border-emerald-700'
                        : completionRate >= 50
                          ? 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                          : completionRate > 0
                            ? 'bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-950/40 border-amber-200 dark:border-amber-800'
                            : 'bg-gradient-to-br from-red-50/80 to-red-100/50 dark:from-red-950/20 dark:to-red-950/40 border-red-200 dark:border-red-800'
                      : ''

                    cells.push(
                      <button
                        key={dateStr}
                        onClick={() => dayData && setDetailItem(dayData)}
                        className={`aspect-square rounded-lg border transition-all relative flex flex-col items-center justify-center gap-0.5 text-sm min-h-[44px] cal-cell ${
                          dayData
                            ? isToday
                              ? 'bg-[#E14227] border-[#E14227] text-white cursor-pointer hover:bg-[#E14227]/90 shadow-lg shadow-[#E14227]/20 animate-today-pulse'
                              : `${heatColor} cursor-pointer hover:shadow-md hover:scale-105`
                            : isToday
                              ? 'border-[#E14227]/50 bg-[#E14227]/5 animate-today-pulse'
                              : 'border-transparent hover:bg-muted/50'
                        }`}
                      >
                        <span className={`font-medium ${isToday && !dayData ? 'text-[#E14227]' : ''} ${dayData && isToday ? 'text-white' : ''}`}>
                          {day}
                        </span>
                        {dayData && (
                          <div className="flex flex-col items-center gap-px">
                            <span className={`text-[8px] font-bold ${isToday ? 'text-white/80' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {dayData.completed}/{dayData.total}
                            </span>
                            {/* Mini completion bar */}
                            <div className="w-5 h-[2px] rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  completionRate >= 80 ? 'bg-emerald-500' :
                                  completionRate >= 50 ? 'bg-amber-500' : 'bg-red-400'
                                }`}
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  }
                  return cells
                })()}
              </div>
            )}

            {/* Calendar Mini Summary */}
            {calendarData.length > 0 && (() => {
              const totalDays = calendarData.length
              const avgRate = Math.round(calendarData.reduce((sum, d) => sum + (d.total > 0 ? (d.completed / d.total) * 100 : 0), 0) / totalDays)
              const bestDay = calendarData.reduce((best, d) => {
                const rate = d.total > 0 ? (d.completed / d.total) * 100 : 0
                return rate > (best.total > 0 ? (best.completed / best.total) * 100 : 0) ? d : best
              }, calendarData[0])
              const bestRate = bestDay.total > 0 ? Math.round((bestDay.completed / bestDay.total) * 100) : 0
              const [by, bm, bd] = bestDay.date.split('-').map(Number)
              const bestDate = new Date(by, bm - 1, bd)
              return (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{totalDays}</p>
                    <p className="text-[10px] text-muted-foreground">Hari dengan Jobdesk</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-600">{avgRate}%</p>
                    <p className="text-[10px] text-muted-foreground">Rata-rata Completion</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{bestRate}%</p>
                    <p className="text-[10px] text-muted-foreground">Terbaik: {bd} {monthNames[bestDate.getMonth()]}</p>
                  </div>
                </div>
              )
            })()}

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-700 border border-emerald-300 dark:border-emerald-600" />
                <span className="text-[11px] text-muted-foreground">≥80%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" />
                <span className="text-[11px] text-muted-foreground">≥50%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" />
                <span className="text-[11px] text-muted-foreground">{'<'}50%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" />
                <span className="text-[11px] text-muted-foreground">0%</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-[#E14227]" />
                <span className="text-[11px] text-muted-foreground">Hari Ini</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── CREATE/EDIT FORM DIALOG ───────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md dialog-enhanced">
          {/* Gradient header stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r from-[#E14227] via-[#E6BAA3] via-[#9DB1CC] to-[#B2AC88]" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E14227] to-[#D4956B] flex items-center justify-center shadow-md">
                {editItem ? <Edit3 className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
              </div>
              {editItem ? 'Edit Jobdesk' : 'Tambah Jobdesk Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Group — shown as non-editable badge */}
            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Group</label>
              <Badge className="bg-[#E14227]/10 text-[#E14227] border-[#E14227]/20 text-sm px-3 py-1 font-semibold">
                {groupPicked?.logo ? (
                  <img src={groupPicked.logo} alt="" className="w-4 h-4 rounded mr-1.5 object-cover" />
                ) : (
                  <Users className="w-4 h-4 mr-1.5" />
                )}
                {groups.find(g => g.id === formData.groupId)?.name || groupPicked?.name || formData.groupId}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Judul Jobdesk *</label>
              <Input
                placeholder="Masukkan judul tugas..."
                value={formData.title}
                onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                className="focus:ring-2 focus:ring-[#E14227]/30 border-border/60"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Deskripsi</label>
              <Textarea
                placeholder="Deskripsi tugas (opsional)..."
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                rows={3}
                className="focus:ring-2 focus:ring-[#E14227]/30 border-border/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Prioritas</label>
                {/* Visual priority selector with colored radio buttons */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, priority: 'high' }))}
                    className={`priority-radio priority-high ${formData.priority === 'high' ? 'selected' : ''}`}
                    title="Tinggi"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, priority: 'medium' }))}
                    className={`priority-radio priority-medium ${formData.priority === 'medium' ? 'selected' : ''}`}
                    title="Sedang"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, priority: 'low' }))}
                    className={`priority-radio priority-low ${formData.priority === 'low' ? 'selected' : ''}`}
                    title="Rendah"
                  >
                    <Circle className="w-3.5 h-3.5 text-emerald-500" />
                  </button>
                  <span className="text-xs text-muted-foreground ml-1">
                    {formData.priority === 'high' ? 'Tinggi' : formData.priority === 'medium' ? 'Sedang' : 'Rendah'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Status</label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v as 'pending' | 'in_progress' | 'completed' }))}>
                  <SelectTrigger className="focus:ring-2 focus:ring-[#E14227]/30 border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⏳ Pending</SelectItem>
                    <SelectItem value="in_progress">🔄 Dalam Proses</SelectItem>
                    <SelectItem value="completed">✅ Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Crew selector - show crews from selected group */}
            {formData.groupId && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ditugaskan ke Crew</label>
                <Select value={formData.crewId} onValueChange={v => setFormData(p => ({ ...p, crewId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih crew (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tanpa crew —</SelectItem>
                    {(formData.groupId ? crews.filter(c => c.groupId === formData.groupId) : []).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.employeeId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editItem && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Verifikasi Admin (%)</label>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium tabular-nums text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md w-24 text-center">
                      {formData.verificationPercent}%
                    </div>
                    <Progress value={formData.verificationPercent} className="flex-1" />
                    <span className="text-[10px] text-muted-foreground">read-only</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Catatan</label>
                  <Textarea
                    placeholder="Catatan admin (opsional)..."
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button
              onClick={handleSaveForm}
              disabled={formSaving}
              className="bg-[#E14227] hover:bg-[#E14227]/90 text-white"
            >
              {formSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editItem ? 'Simpan Perubahan' : 'Buat Jobdesk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRM DIALOG ─────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Jobdesk</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus jobdesk <strong>&ldquo;{deleteName}&rdquo;</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── HISTORY DETAIL DIALOG ─────────────────────── */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Jobdesk — {detailItem?.date && (() => {
                const [y, m, d] = detailItem.date.split('-').map(Number)
                const date = new Date(y, m - 1, d)
                return `${dayNames[date.getDay()]}, ${d} ${monthNames[m - 1]} ${y}`
              })()}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96 pr-4">
            <div className="space-y-3">
              {/* Stats */}
              {detailItem && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{detailItem.completed}</p>
                    <p className="text-[10px] text-muted-foreground">Selesai</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-600">{detailItem.inProgress}</p>
                    <p className="text-[10px] text-muted-foreground">Proses</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{detailItem.avgVerification}%</p>
                    <p className="text-[10px] text-muted-foreground">Verifikasi</p>
                  </div>
                </div>
              )}

              {/* Jobdesk list */}
              {detailItem?.jobdesks.map(item => (
                <div key={item.id} className="bg-muted/30 rounded-lg p-3 border">
                  <div className="flex items-start gap-2">
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    ) : item.status === 'in_progress' ? (
                      <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${priorityConfig[item.priority].color}`}>
                          {priorityConfig[item.priority].label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{item.group.name}</span>
                        {item.crew && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <User className="w-2.5 h-2.5" />
                            {item.crew.name}
                          </span>
                        )}
                      </div>
                      {item.verificationPercent > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={item.verificationPercent} className="h-1 flex-1" />
                          <span className="text-[10px] font-medium">{item.verificationPercent}%</span>
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-muted-foreground italic mt-1.5 p-1.5 bg-background/50 rounded">📝 {item.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailItem(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SHIFT SETTINGS DIALOG ─────────────────────── */}
      <Dialog open={showShiftSettings} onOpenChange={setShowShiftSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pengaturan Jam Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Jam Mulai Shift</label>
              <Input
                type="time"
                value={shiftForm.shiftStart}
                onChange={e => setShiftForm(p => ({ ...p, shiftStart: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Jam Berakhir Shift</label>
              <Input
                type="time"
                value={shiftForm.shiftEnd}
                onChange={e => setShiftForm(p => ({ ...p, shiftEnd: e.target.value }))}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Summary jobdesk akan ditampilkan ketika jam shift berakhir. Semua waktu dalam WIB (UTC+7).
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowShiftSettings(false)}>Batal</Button>
            <Button
              onClick={handleSaveShift}
              disabled={shiftSaving}
              className="bg-[#E14227] hover:bg-[#E14227]/90 text-white"
            >
              {shiftSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─── PRINT PREVIEW DIALOG ──────────────────── */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#E14227]" />
              Print Preview — Laporan Jobdesk
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowPrintPreview(false)}>
              <X className="w-4 h-4 mr-1" /> Tutup
            </Button>
            <Button size="sm" onClick={() => window.print()} className="bg-[#E14227] hover:bg-[#E14227]/90 text-white">
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const params = new URLSearchParams({ date: selectedDate })
              if (selectedGroupId) params.set('groupId', selectedGroupId)
              window.open(`/api/jobdesk/export?${params}`, '_blank')
            }}>
              <Download className="w-4 h-4 mr-1" /> Download CSV
            </Button>
          </div>
          <div ref={printAreaRef} id="jobdesk-print-area" className="flex-1 overflow-auto border rounded-lg p-6 bg-white text-black text-sm">
            <div className="text-center mb-6 border-b pb-4">
              <h1 className="text-xl font-bold">Laporan Jobdesk Harian</h1>
              <p className="text-muted-foreground mt-1">{formatDateDisplay(selectedDate)}</p>
              {selectedGroupId && (
                <p className="text-muted-foreground">Group: {groups.find(g => g.id === selectedGroupId)?.name || selectedGroupId}</p>
              )}
            </div>
            {summary && (
              <table className="w-full mb-6 border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-3 py-2 text-left">Total</th>
                    <th className="border px-3 py-2 text-left">Selesai</th>
                    <th className="border px-3 py-2 text-left">Proses</th>
                    <th className="border px-3 py-2 text-left">Pending</th>
                    <th className="border px-3 py-2 text-left">Rata-rata Verifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-semibold">
                    <td className="border px-3 py-2">{summary.total}</td>
                    <td className="border px-3 py-2 text-emerald-700">{summary.completed}</td>
                    <td className="border px-3 py-2 text-blue-700">{summary.inProgress}</td>
                    <td className="border px-3 py-2 text-gray-600">{summary.pending}</td>
                    <td className="border px-3 py-2 text-amber-700">{summary.avgVerification}%</td>
                  </tr>
                </tbody>
              </table>
            )}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-2 text-center w-10">No</th>
                  <th className="border px-3 py-2 text-left">Judul</th>
                  <th className="border px-2 py-2 text-center">Prioritas</th>
                  <th className="border px-2 py-2 text-center">Status</th>
                  <th className="border px-2 py-2 text-left">Crew</th>
                  <th className="border px-2 py-2 text-center">Verifikasi(%)</th>
                  <th className="border px-2 py-2 text-left">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {displayJobdesks.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border px-2 py-1.5 text-center">{idx + 1}</td>
                    <td className="border px-3 py-1.5 font-medium">{item.title}</td>
                    <td className="border px-2 py-1.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.priority === 'high' ? 'bg-red-100 text-red-700' : item.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {priorityConfig[item.priority as keyof typeof priorityConfig].label}
                      </span>
                    </td>
                    <td className="border px-2 py-1.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : item.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {statusConfig[item.status as keyof typeof statusConfig].label}
                      </span>
                    </td>
                    <td className="border px-2 py-1.5">{item.crew?.name || '-'}</td>
                    <td className="border px-2 py-1.5 text-center">{item.verificationPercent}%</td>
                    <td className="border px-2 py-1.5 text-xs text-gray-500">{item.notes || '-'}</td>
                  </tr>
                ))}
                {displayJobdesks.length === 0 && (
                  <tr><td colSpan={7} className="border px-3 py-6 text-center text-gray-400">Tidak ada data jobdesk</td></tr>
                )}
              </tbody>
            </table>
            <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs text-gray-500">
              <span>Dicetak pada: {getWIBDate().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</span>
              <span>3SC CMS v3.0</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── TEMPLATE MANAGEMENT DIALOG ────────────────── */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#E14227]" />
              Template Jobdesk
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={handleAutoGenerate} disabled={autoGenerating} className="bg-gradient-to-r from-[#E14227] to-[#D4956B] hover:from-[#E14227]/90 hover:to-[#D4956B]/90 text-white">
              {autoGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              Auto-Generate Hari Ini
            </Button>
            <Button size="sm" onClick={() => {
              setEditingTemplateId(null)
              setTemplateForm({ title: '', description: '', priority: 'medium', groupId: '', crewId: '' })
              setShowTemplateForm(true)
            }}>
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Template
            </Button>
          </div>

          {showTemplateForm ? (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <h4 className="font-semibold text-sm">{editingTemplateId ? 'Edit Template' : 'Template Baru'}</h4>
              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Judul *</label>
                  <Input value={templateForm.title} onChange={e => setTemplateForm(f => ({ ...f, title: e.target.value }))} placeholder="Judul template" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi</label>
                  <Textarea value={templateForm.description} onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi opsional" rows={2} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Group *</label>
                    <Select value={templateForm.groupId} onValueChange={v => setTemplateForm(f => ({ ...f, groupId: v, crewId: '' }))}>
                      <SelectTrigger><SelectValue placeholder="Pilih group" /></SelectTrigger>
                      <SelectContent>
                        {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Crew</label>
                    <Select value={templateForm.crewId || '__none__'} onValueChange={v => setTemplateForm(f => ({ ...f, crewId: v === '__none__' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Semua crew" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Semua Crew</SelectItem>
                        {(templateForm.groupId ? crews.filter(c => c.groupId === templateForm.groupId) : crews).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioritas</label>
                    <Select value={templateForm.priority} onValueChange={v => setTemplateForm(f => ({ ...f, priority: v as 'low' | 'medium' | 'high' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Tinggi</SelectItem>
                        <SelectItem value="medium">Sedang</SelectItem>
                        <SelectItem value="low">Rendah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" onClick={handleSaveTemplate} disabled={templateSaving} className="bg-[#E14227] hover:bg-[#E14227]/90 text-white">
                  {templateSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  {editingTemplateId ? 'Perbarui' : 'Simpan'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowTemplateForm(false); setEditingTemplateId(null) }}>Batal</Button>
              </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-auto">
            {templatesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-14 bg-muted rounded-lg" />)}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Belum ada template. Buat template untuk auto-generate jobdesk harian.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border ${t.active ? 'bg-white dark:bg-gray-900' : 'bg-muted/30 opacity-60'}`}>
                    <button onClick={() => handleToggleTemplate(t.id, t.active)} className="flex-shrink-0" title={t.active ? 'Nonaktifkan' : 'Aktifkan'}>
                      {t.active ? (
                        <Power className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{t.title}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityConfig[t.priority as keyof typeof priorityConfig]?.color || ''}`}>
                          {priorityConfig[t.priority as keyof typeof priorityConfig]?.label || t.priority}
                        </Badge>
                        <Badge variant={t.active ? 'default' : 'secondary'} className={`text-[10px] px-1.5 py-0 ${t.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : ''}`}>
                          {t.active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{t.group?.name || t.groupId}</span>
                        {t.crew && <><span>•</span><User className="w-3 h-3" /><span>{t.crew.name}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                        setEditingTemplateId(t.id)
                        setTemplateForm({ title: t.title, description: t.description || '', priority: t.priority as 'low' | 'medium' | 'high', groupId: t.groupId, crewId: t.crewId || '' })
                        setShowTemplateForm(true)
                      }}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDeleteTemplate(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {crewNameDialog}
    </motion.div>
    </TabsContent>
  )
}
