'use client'

import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { toast } from 'sonner'
import { Shield, Users, Target, DollarSign, Plus, Trash2, Edit2, Search, X, BarChart3, Download, Upload, Database, Loader2, CheckCircle2 } from 'lucide-react'
import { fmtRp, fmtNum, fadeIn, stagger, safeFetch } from '@/lib/cms-utils'
import type { Group, Crew } from '@/lib/cms-types'
import CrewForm from '@/components/management/CrewForm'
import GroupForm from '@/components/management/GroupForm'
import LoadingOverlay from '@/components/ui/LoadingOverlay'

interface ManagementTabProps {
  isAdmin: boolean
  mgmtLoading: boolean
  loginForm: { username: string; password: string }
  setLoginForm: (f: { username: string; password: string }) => void
  handleLogin: () => void
  groups: Group[]
  mgmtCrews: Crew[]
  mgmtSearch: string
  setMgmtSearch: (v: string) => void
  showAddCrew: boolean
  setShowAddCrew: (v: boolean) => void
  showAddGroup: boolean
  setShowAddGroup: (v: boolean) => void
  editCrew: Crew | null
  setEditCrew: (c: Crew | null) => void
  editGroup: Group | null
  setEditGroup: (g: Group | null) => void
  filteredMgmtCrews: Crew[]
  filteredGroups: Group[]
  handleSaveCrew: (data: { name: string; photo: string; employeeId: string; groupId: string }) => void
  handleDeleteCrew: (id: string) => void
  handleSaveGroup: (data: { name: string; logo: string; monthlyTarget: number; week1Target: number; week2Target: number; week3Target: number; week4Target: number }) => void
  handleDeleteGroup: (id: string) => void
  setDeleteConfirm: (v: { type: 'crew' | 'group' | 'sale' | 'batch-sale'; ids?: string[]; id?: string; name: string } | null) => void
}

const ManagementTab = React.memo(function ManagementTab({
  isAdmin, mgmtLoading, loginForm, setLoginForm, handleLogin,
  groups, mgmtCrews, mgmtSearch, setMgmtSearch,
  showAddCrew, setShowAddCrew, showAddGroup, setShowAddGroup,
  editCrew, setEditCrew, editGroup, setEditGroup,
  filteredMgmtCrews, filteredGroups,
  handleSaveCrew, handleDeleteCrew, handleSaveGroup, handleDeleteGroup,
  setDeleteConfirm,
}: ManagementTabProps) {
  return (
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
        <LoadingOverlay loading={mgmtLoading} label="Memuat data management...">
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

          {/* ─── Data Migration Section ─── */}
          <DataMigrationSection />

        </motion.div>
        </LoadingOverlay>
      )}
    </TabsContent>
  )
})

export default ManagementTab

// ─── Data Migration Sub-Component ───────────────────────────
interface ImportSummary {
  groups: { imported: number; skipped: number; total: number }
  crews: { imported: number; skipped: number; total: number }
  sales: { imported: number; skipped: number; total: number }
  clearExisting: boolean
}

function DataMigrationSection() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await safeFetch('/api/data/export')
      if (!r.ok) { toast.error('Gagal mengekspor data'); return }
      const blob = await r.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      const dateStr = new Date().toISOString().split('T')[0]
      link.download = `cms-backup-${dateStr}.json`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('Data berhasil diekspor')
    } catch { toast.error('Gagal mengekspor data') }
    finally { setExporting(false) }
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.json')) {
      toast.error('File harus berformat JSON')
      e.target.value = ''
      return
    }
    setImportFile(file)
    setImportResult(null)
    setShowImportConfirm(true)
    e.target.value = ''
  }

  const handleConfirmImport = async () => {
    if (!importFile) return
    setShowImportConfirm(false)
    setImporting(true)
    setImportResult(null)
    try {
      const r = await safeFetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: await importFile.text(),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      setImportResult(d.summary)
      const totalImported = d.summary.groups.imported + d.summary.crews.imported + d.summary.sales.imported
      toast.success(`Import berhasil! ${totalImported} data diimpor`)
    } catch { toast.error('Gagal mengimpor data') }
    finally { setImporting(false); setImportFile(null) }
  }

  return (
    <motion.div {...fadeIn} transition={{ delay: 0.3 }}>
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Data Migration</CardTitle>
              <p className="text-[10px] text-muted-foreground">Export & import data untuk migrasi database</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Export */}
            <div className="p-4 rounded-xl border border-border/60 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Export Data</p>
                  <p className="text-[10px] text-muted-foreground">Download semua data sebagai JSON</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Menyertakan groups, crews, dan semua data penjualan. File dapat digunakan untuk backup atau migrasi.
              </p>
              <Button
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Mengekspor...</>
                ) : (
                  <><Download className="w-4 h-4 mr-1.5" />Export JSON</>
                )}
              </Button>
            </div>

            {/* Import */}
            <div className="p-4 rounded-xl border border-border/60 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Import Data</p>
                  <p className="text-[10px] text-muted-foreground">Upload file JSON untuk migrasi</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Upload file backup JSON. Data duplikat akan dilewati. Data groups & crews di-upsert berdasarkan nama.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Mengimpor...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-1.5" />Import JSON</>
                )}
              </Button>
            </div>
          </div>

          {/* Import Result */}
          {importResult && (
            <motion.div {...fadeIn} className="mt-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Import Berhasil</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Groups', data: importResult.groups },
                  { label: 'Crews', data: importResult.crews },
                  { label: 'Sales', data: importResult.sales },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">{item.label}</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{item.data.imported}</p>
                    <p className="text-[10px] text-muted-foreground">{item.data.skipped} duplikat</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Import Data</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan mengimpor data dari file <span className="font-semibold">{importFile?.name}</span>.
              Data duplikat akan dilewati secara otomatis. Data groups & crews yang sudah ada akan dipertahankan (upsert by nama).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowImportConfirm(false); setImportFile(null) }}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} className="bg-emerald-600 hover:bg-emerald-700">
              Lanjutkan Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
