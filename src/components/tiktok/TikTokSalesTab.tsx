'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight,
  Truck, CheckCircle2, RotateCcw, XCircle, ShoppingBag,
  Package, DollarSign, Hash, Ruler, Users, CalendarDays,
  ArrowUpDown, Filter, Download, Upload, FileSpreadsheet, Loader2, AlertTriangle,
} from 'lucide-react'
import { fmtRp, fmtNum, fadeIn, stagger, getWIBToday, getPageNumbers } from '@/lib/cms-utils'
import type { Crew } from '@/lib/cms-types'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────
interface TikTokSaleItem {
  id: string
  tanggal: string
  idOrder: string
  status: string
  artikel: string
  size: string | null
  qty: number
  revenue: number
  settle: number
  crewId: string | null
  crew: { id: string; name: string; employeeId: string; photo: string | null; group: { name: string } } | null
  createdAt: string
  updatedAt: string
}

interface TikTokSummary {
  totalRevenue: number
  totalSettle: number
  totalQty: number
  count: number
}

interface TikTokSalesTabProps {
  crews: Crew[]
  groups: Array<{ id: string; name: string; tiktokActive: boolean }>
}

const STATUS_OPTIONS = ['Pengiriman', 'Selesai', 'Retur', 'Batal'] as const

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  Pengiriman: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', icon: Truck, label: 'Pengiriman' },
  Selesai: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', icon: CheckCircle2, label: 'Selesai' },
  Retur: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', icon: RotateCcw, label: 'Retur' },
  Batal: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800', icon: XCircle, label: 'Batal' },
}

const EMPTY_FORM = {
  tanggal: '', idOrder: '', status: 'Pengiriman', artikel: '', size: '', qty: 1, revenue: 0, settle: 0, crewId: '',
}

// ─── Component ──────────────────────────────────────────
const TikTokSalesTab: React.FC<TikTokSalesTabProps> = ({ crews, groups }) => {
  // Only show crews from TikTok-active groups
  const activeGroupIds = new Set(groups.filter(g => g.tiktokActive).map(g => g.id))
  const tiktokCrews = useMemo(() => crews.filter(c => activeGroupIds.has(c.group?.id || c.groupId)), [crews, activeGroupIds])

  // Data state
  const [items, setItems] = useState<TikTokSaleItem[]>([])
  const [summary, setSummary] = useState<TikTokSummary>({ totalRevenue: 0, totalSettle: 0, totalQty: 0, count: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCrew, setFilterCrew] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Import state
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Crew search in form
  const [crewSearch, setCrewSearch] = useState('')
  const [showCrewDropdown, setShowCrewDropdown] = useState(false)
  const crewDropdownRef = useRef<HTMLDivElement>(null)

  // Close crew dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (crewDropdownRef.current && !crewDropdownRef.current.contains(e.target as Node)) {
        setShowCrewDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Filtered crews for dropdown
  const filteredCrews = useMemo(() => {
    if (!crewSearch) return tiktokCrews.slice(0, 20)
    const q = crewSearch.toLowerCase()
    return tiktokCrews.filter(c => c.name.toLowerCase().includes(q) || c.employeeId.toLowerCase().includes(q)).slice(0, 20)
  }, [tiktokCrews, crewSearch])

  const selectedCrew = useMemo(() => {
    if (!form.crewId) return null
    return tiktokCrews.find(c => c.id === form.crewId) || null
  }, [form.crewId, tiktokCrews])

  // ─── Fetch data ────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50', sortField, sortDir })
      if (search) params.set('search', search)
      if (filterStatus) params.set('status', filterStatus)
      if (filterCrew) params.set('crewId', filterCrew)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/tiktok-sales?${params}`)
      if (!res.ok) throw new Error('Gagal fetch data')
      const data = await res.json()
      setItems(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setSummary(data.summary)
    } catch {
      toast.error('Gagal memuat data penjualan TikTok')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus, filterCrew, dateFrom, dateTo, sortField, sortDir])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Form handlers ─────────────────────────────────
  const openAddForm = () => {
    setForm({ ...EMPTY_FORM, tanggal: getWIBToday() })
    setEditingId(null)
    setShowForm(true)
    setCrewSearch('')
  }

  const openEditForm = (item: TikTokSaleItem) => {
    setForm({
      tanggal: item.tanggal,
      idOrder: item.idOrder,
      status: item.status,
      artikel: item.artikel,
      size: item.size || '',
      qty: item.qty,
      revenue: item.revenue,
      settle: item.settle,
      crewId: item.crewId || '',
    })
    setEditingId(item.id)
    setShowForm(true)
    setCrewSearch(item.crew?.name || '')
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setCrewSearch('')
  }

  const handleSave = async () => {
    if (!form.tanggal || !form.idOrder.trim() || !form.artikel.trim()) {
      toast.error('Tanggal, ID Order, dan Artikel wajib diisi')
      return
    }
    setSaving(true)
    try {
      const url = editingId ? '/api/tiktok-sales' : '/api/tiktok-sales'
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { id: editingId, ...form } : form

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal menyimpan')
      }
      toast.success(editingId ? 'Penjualan TikTok diperbarui' : 'Penjualan TikTok ditambahkan')
      cancelForm()
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus penjualan TikTok ini?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/tiktok-sales?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Penjualan TikTok dihapus')
      fetchData()
    } catch {
      toast.error('Gagal menghapus')
    } finally {
      setDeleting(null)
    }
  }

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  // ─── Export CSV ────────────────────────────────
  const handleExport = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterStatus) params.set('status', filterStatus)
    if (filterCrew) params.set('crewId', filterCrew)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    window.open(`/api/tiktok-sales/export?${params.toString()}`, '_blank')
  }, [search, filterStatus, filterCrew, dateFrom, dateTo])

  // ─── Import CSV/XLSX ─────────────────────────────
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/tiktok-sales/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Gagal mengimpor')
        return
      }

      // Show result
      if (data.imported > 0) {
        toast.success(`Berhasil mengimpor ${data.imported} baris` + (data.skipped > 0 ? ` (${data.skipped} dilewati)` : ''))
      } else {
        toast.info(`Tidak ada baris baru. ${data.skipped} baris dilewati (duplikat/invalid).`)
      }

      if (data.errorCount > 0) {
        const detail = data.errors.slice(0, 5).join('\n')
        toast.warning(`${data.errorCount} baris bermasalah:\n${detail}`, { duration: 6000 })
      }

      fetchData()
    } catch {
      toast.error('Gagal mengimpor file')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [fetchData])

  const hasFilters = search || filterStatus || filterCrew || dateFrom || dateTo
  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterCrew(''); setDateFrom(''); setDateTo('')
    setPage(1)
  }

  // ─── Render ────────────────────────────────────────
  return (
    <TabsContent value="tiktok" className="mt-0">
      <motion.div {...fadeIn} className="space-y-4 p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[#E14227]" />
              Penjualan TikTok
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Kelola data penjualan TikTok per order</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs border-dashed hover:border-solid">
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="gap-1.5 text-xs border-dashed hover:border-solid"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {importing ? 'Mengimpor...' : 'Import'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <Button onClick={openAddForm} className="bg-[#E14227] hover:bg-[#c7391f] text-white shadow-lg shadow-[#E14227]/20 gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah Penjualan</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-[#1A1A1B]/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Package className="w-3.5 h-3.5" /> Total Order
              </div>
              <p className="text-xl font-bold">{fmtNum(summary.count)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-[#1A1A1B]/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Revenue
              </div>
              <p className="text-xl font-bold">{fmtRp(summary.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-[#1A1A1B]/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Settle
              </div>
              <p className="text-xl font-bold">{fmtRp(summary.totalSettle)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-[#1A1A1B]/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Hash className="w-3.5 h-3.5" /> Total Qty
              </div>
              <p className="text-xl font-bold">{fmtNum(summary.totalQty)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-[#1A1A1B]/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filter</span>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs text-red-500 hover:text-red-600">
                  <X className="w-3 h-3 mr-1" /> Reset
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="relative col-span-2 sm:col-span-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Cari ID Order / Artikel..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-8 h-9 text-sm" />
              </div>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v === '__all__' ? '' : v); setPage(1) }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Semua Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Status</SelectItem>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCrew} onValueChange={v => { setFilterCrew(v === '__all__' ? '' : v); setPage(1) }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Semua Crew" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Crew</SelectItem>
                  {tiktokCrews.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="h-9 text-sm" placeholder="Dari" />
              <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="h-9 text-sm" placeholder="Sampai" />
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-0 shadow-md bg-white dark:bg-[#1A1A1B] border-t-4 border-t-[#E14227]">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">{editingId ? 'Edit Penjualan TikTok' : 'Tambah Penjualan TikTok'}</h3>
                    <Button variant="ghost" size="icon" onClick={cancelForm} className="h-8 w-8"><X className="w-4 h-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {/* Tanggal */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Tanggal *</label>
                      <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    {/* ID Order */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">ID Order *</label>
                      <Input placeholder="cth: TT240701001" value={form.idOrder} onChange={e => setForm(f => ({ ...f, idOrder: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    {/* Status */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                      <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Artikel */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Artikel *</label>
                      <Input placeholder="Nama produk" value={form.artikel} onChange={e => setForm(f => ({ ...f, artikel: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    {/* Size */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Size</label>
                      <Input placeholder="cth: 42, M, L" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    {/* Qty */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Qty</label>
                      <Input type="number" min="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: parseInt(e.target.value) || 1 }))} className="h-9 text-sm" />
                    </div>
                    {/* Revenue */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Revenue</label>
                      <Input type="number" min="0" step="1000" value={form.revenue} onChange={e => setForm(f => ({ ...f, revenue: parseFloat(e.target.value) || 0 }))} className="h-9 text-sm" placeholder="0" />
                    </div>
                    {/* Settle */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Settle</label>
                      <Input type="number" min="0" step="1000" value={form.settle} onChange={e => setForm(f => ({ ...f, settle: parseFloat(e.target.value) || 0 }))} className="h-9 text-sm" placeholder="0" />
                    </div>
                    {/* Crew */}
                    <div className="col-span-2 relative" ref={crewDropdownRef}>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Crew</label>
                      {selectedCrew ? (
                        <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50 text-sm">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={selectedCrew.photo || undefined} />
                            <AvatarFallback className="text-[9px]">{selectedCrew.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="flex-1 truncate">{selectedCrew.name}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setForm(f => ({ ...f, crewId: '' })); setCrewSearch('') }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Input
                          placeholder="Cari crew..."
                          value={crewSearch}
                          onChange={e => { setCrewSearch(e.target.value); setShowCrewDropdown(true) }}
                          onFocus={() => setShowCrewDropdown(true)}
                          className="h-9 text-sm"
                        />
                      )}
                      <AnimatePresence>
                        {showCrewDropdown && !selectedCrew && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-lg"
                          >
                            {filteredCrews.length === 0 ? (
                              <div className="p-3 text-sm text-muted-foreground text-center">Crew tidak ditemukan</div>
                            ) : filteredCrews.map(c => (
                              <button
                                key={c.id}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/80 transition-colors text-left"
                                onClick={() => { setForm(f => ({ ...f, crewId: c.id })); setCrewSearch(c.name); setShowCrewDropdown(false) }}
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={c.photo || undefined} />
                                  <AvatarFallback className="text-[9px]">{c.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{c.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{c.employeeId} · {c.group?.name}</p>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={cancelForm} className="text-sm">Batal</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-[#E14227] hover:bg-[#c7391f] text-white text-sm gap-2">
                      {saving ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-[#1A1A1B]/80 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold h-9 w-10">#</TableHead>
                  <TableHead className="text-xs font-semibold h-9 cursor-pointer select-none" onClick={() => toggleSort('tanggal')}>
                    <span className="flex items-center gap-1">Tanggal <ArrowUpDown className="w-3 h-3" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-semibold h-9 cursor-pointer select-none" onClick={() => toggleSort('idOrder')}>
                    <span className="flex items-center gap-1">ID Order <ArrowUpDown className="w-3 h-3" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-semibold h-9 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    <span className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-semibold h-9">Artikel</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-center">Size</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-right cursor-pointer select-none" onClick={() => toggleSort('qty')}>
                    <span className="flex items-center justify-end gap-1">Qty <ArrowUpDown className="w-3 h-3" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-right cursor-pointer select-none" onClick={() => toggleSort('revenue')}>
                    <span className="flex items-center justify-end gap-1">Revenue <ArrowUpDown className="w-3 h-3" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-right cursor-pointer select-none" onClick={() => toggleSort('settle')}>
                    <span className="flex items-center justify-end gap-1">Settle <ArrowUpDown className="w-3 h-3" /></span>
                  </TableHead>
                  <TableHead className="text-xs font-semibold h-9">Crew</TableHead>
                  <TableHead className="text-xs font-semibold h-9 text-center w-20">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <TableCell key={j} className="py-3">
                          <div className="h-4 bg-muted/60 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <div className="text-muted-foreground">
                        <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada data penjualan TikTok</p>
                        <Button variant="link" className="text-[#E14227] text-sm mt-1" onClick={openAddForm}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah pertama
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, i) => {
                    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.Pengiriman
                    const StatusIcon = sc.icon
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                      >
                        <TableCell className="py-2.5 text-xs text-muted-foreground">{(page - 1) * 50 + i + 1}</TableCell>
                        <TableCell className="py-2.5 text-xs font-mono">{item.tanggal}</TableCell>
                        <TableCell className="py-2.5 text-xs font-mono font-medium">{item.idOrder}</TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 border ${sc.bg} ${sc.color} gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-xs font-medium max-w-[160px] truncate" title={item.artikel}>{item.artikel}</TableCell>
                        <TableCell className="py-2.5 text-xs text-center">{item.size || '—'}</TableCell>
                        <TableCell className="py-2.5 text-xs text-right font-mono">{fmtNum(item.qty)}</TableCell>
                        <TableCell className="py-2.5 text-xs text-right font-mono">{fmtRp(item.revenue)}</TableCell>
                        <TableCell className="py-2.5 text-xs text-right font-mono font-medium">{fmtRp(item.settle)}</TableCell>
                        <TableCell className="py-2.5">
                          {item.crew ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={item.crew.photo || undefined} />
                                <AvatarFallback className="text-[8px]">{item.crew.name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium truncate max-w-[100px]">{item.crew.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(item)} title="Edit">
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item.id)} disabled={deleting === item.id} title="Hapus">
                              <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {total} data · Halaman {page} dari {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`dot-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      size="icon"
                      className={`h-7 w-7 text-xs ${page === p ? 'bg-[#E14227] hover:bg-[#c7391f] text-white' : ''}`}
                      onClick={() => setPage(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </TabsContent>
  )
}

export default React.memo(TikTokSalesTab)