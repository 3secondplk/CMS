'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Info, Monitor, Database, Shield, Loader2, Trash2, Download,
  Eye, EyeOff, Clock, User, KeyRound, AlertTriangle, Save, RefreshCw,
  Sparkles, Heart, Layers, Code2,
} from 'lucide-react'
import { fadeIn, safeFetch } from '@/lib/cms-utils'

// ─── localStorage helpers ──────────────────────────────
function getLs(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}
function setLs(key: string, value: string) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, value) } catch { /* ignore */ }
}
function getLsBool(key: string, fallback: boolean): boolean {
  return getLs(key, String(fallback)) === 'true'
}

interface SettingsPanelProps {
  isAdmin: boolean
  adminName: string
  onPasswordChanged: () => void
  onDataCleared: () => void
}

export default function SettingsPanel({
  isAdmin,
  adminName,
  onPasswordChanged,
  onDataCleared,
}: SettingsPanelProps) {
  // ─── Display Preferences State ───────────────────────
  const [defaultTab, setDefaultTab] = useState('dashboard')
  const [compactMode, setCompactMode] = useState(false)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState('off')

  // ─── Password Change State ──────────────────────────
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // ─── Data Management State ──────────────────────────
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearingData, setClearingData] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  // ─── Session Info ───────────────────────────────────
  const [loginTime, setLoginTime] = useState<string>('—')

  // Load settings from localStorage on mount
  useEffect(() => {
    setDefaultTab(getLs('cms-default-tab', 'dashboard'))
    setCompactMode(getLsBool('cms-compact-mode', false))
    setAnimationsEnabled(getLsBool('cms-animations-enabled', true))
    setRefreshInterval(getLs('cms-refresh-interval', 'off'))

    // Get login time from localStorage
    const lt = getLs('cms-login-time', '')
    if (lt) {
      try {
        const d = new Date(lt)
        setLoginTime(d.toLocaleString('id-ID', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }))
      } catch { setLoginTime(lt) }
    }
  }, [])

  // Persist settings
  const handleDefaultTabChange = (value: string) => {
    setDefaultTab(value)
    setLs('cms-default-tab', value)
    toast.success(`Tab default diubah ke "${value === 'dashboard' ? 'Dashboard' : value === 'claims' ? 'Claim Penjualan' : 'Management'}"`, { duration: 2000 })
  }

  const handleCompactModeChange = (checked: boolean) => {
    setCompactMode(checked)
    setLs('cms-compact-mode', String(checked))
    toast.success(checked ? 'Mode compact diaktifkan' : 'Mode compact dinonaktifkan', { duration: 2000 })
  }

  const handleAnimationsChange = (checked: boolean) => {
    setAnimationsEnabled(checked)
    setLs('cms-animations-enabled', String(checked))
    toast.success(checked ? 'Animasi diaktifkan' : 'Animasi dinonaktifkan', { duration: 2000 })
  }

  const handleRefreshIntervalChange = (value: string) => {
    setRefreshInterval(value)
    setLs('cms-refresh-interval', value)
    const label = value === 'off' ? 'Nonaktif' : `${value}`
    toast.success(`Auto-refresh: ${label}`, { duration: 2000 })
  }

  // ─── Password Change Handler ────────────────────────
  const handleChangePassword = async () => {
    if (!currentPassword) { toast.error('Password lama harus diisi'); return }
    if (!newPassword) { toast.error('Password baru harus diisi'); return }
    if (newPassword.length < 6) { toast.error('Password baru minimal 6 karakter'); return }
    if (newPassword !== confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return }
    if (currentPassword === newPassword) { toast.error('Password baru harus berbeda dari password lama'); return }

    setChangingPassword(true)
    try {
      const r = await safeFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }

      toast.success('Password berhasil diubah, silakan login kembali')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onPasswordChanged()
    } catch {
      toast.error('Gagal mengubah password')
    } finally {
      setChangingPassword(false)
    }
  }

  // ─── Clear All Data Handler ─────────────────────────
  const handleClearAll = async () => {
    setClearingData(true)
    try {
      const r = await safeFetch('/api/data/clear-all', { method: 'DELETE' })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }

      toast.success('Semua data berhasil dihapus')
      setShowClearConfirm(false)
      onDataCleared()
      // Reload after short delay
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      toast.error('Gagal menghapus data')
    } finally {
      setClearingData(false)
    }
  }

  // ─── Export All Data Handler ─────────────────────────
  const handleExportAll = async () => {
    setExportingData(true)
    try {
      const r = await safeFetch('/api/data/export-all')
      if (!r.ok) { toast.error('Gagal mengekspor data'); return }
      const data = await r.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      const dateStr = new Date().toISOString().split('T')[0]
      link.download = `cms-backup-${dateStr}.json`
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('Backup berhasil diunduh')
    } catch {
      toast.error('Gagal mengekspor data')
    } finally {
      setExportingData(false)
    }
  }

  // ─── Session expiry calculation ─────────────────────
  const getExpiryDate = () => {
    const lt = getLs('cms-login-time', '')
    if (!lt) return '—'
    try {
      const login = new Date(lt)
      const expiry = new Date(login.getTime() + 7 * 24 * 60 * 60 * 1000)
      return expiry.toLocaleString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return '—' }
  }

  return (
    <motion.div {...fadeIn} className="space-y-5">
      {/* ═══════════════════════════════════════════════════
          SECTION 1: APP INFO
          ═══════════════════════════════════════════════════ */}
      <Card className="border-0 shadow-lg overflow-hidden glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E14227] to-[#D4956B] flex items-center justify-center shadow-lg shadow-[#E14227]/20">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Informasi Aplikasi</CardTitle>
              <p className="text-[10px] text-muted-foreground">Detail tentang sistem ini</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="bg-gradient-to-r from-[#F0D5C5] to-[#B5C7DB] dark:from-[#1A1A1B]/30 dark:to-[#1A1A1B]/20 rounded-xl p-4 border border-[#E6BAA3]/50 dark:border-[#B8321E]/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#E14227]" />
              <h3 className="text-sm font-bold text-[#B8321E] dark:text-[#E6BAA3]">3SC CMS Crew Management System</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <p className="text-muted-foreground">Versi</p>
                <Badge variant="outline" className="text-[10px] font-semibold">v3.0</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Developer</p>
                <p className="font-semibold text-foreground">Ahtjong Labs</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Dibangun dengan</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Next.js 16', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
                { label: 'Prisma', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
                { label: 'Tailwind CSS', color: 'bg-[#D5E0ED] text-[#5A7494] dark:bg-[#7E95B3]/40 dark:text-[#B5C7DB]' },
                { label: 'Framer Motion', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
              ].map((tech) => (
                <span key={tech.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${tech.color}`}>
                  <Code2 className="w-2.5 h-2.5" />
                  {tech.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 pt-1">
            <Heart className="w-3 h-3 text-rose-400" />
            <span className="text-[10px] text-muted-foreground">
              &copy; {new Date().getFullYear()} Ahtjong Labs. All rights reserved.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════
          SECTION 2: DISPLAY PREFERENCES
          ═══════════════════════════════════════════════════ */}
      <Card className="border-0 shadow-lg overflow-hidden glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E6BAA3] to-[#D4956B] flex items-center justify-center shadow-lg shadow-[#E6BAA3]/20">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Preferensi Tampilan</CardTitle>
              <p className="text-[10px] text-muted-foreground">Atur tampilan dan perilaku aplikasi</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Default Tab */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-xs font-semibold text-foreground">Tab Default</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tab yang ditampilkan saat aplikasi dibuka</p>
            </div>
            <Select value={defaultTab} onValueChange={handleDefaultTabChange}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="claims">Claim Penjualan</SelectItem>
                <SelectItem value="management">Management</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Compact Mode */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-xs font-semibold text-foreground">Mode Compact</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Kurangi padding dan ukuran font</p>
            </div>
            <Switch
              checked={compactMode}
              onCheckedChange={handleCompactModeChange}
              aria-label="Toggle compact mode"
            />
          </div>

          <Separator />

          {/* Animations Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-xs font-semibold text-foreground">Animasi</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Aktifkan/nonaktifkan animasi transisi</p>
            </div>
            <Switch
              checked={animationsEnabled}
              onCheckedChange={handleAnimationsChange}
              aria-label="Toggle animations"
            />
          </div>

          <Separator />

          {/* Auto-Refresh Interval */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Label className="text-xs font-semibold text-foreground">Auto-Refresh Dashboard</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Interval refresh otomatis data dashboard</p>
            </div>
            <Select value={refreshInterval} onValueChange={handleRefreshIntervalChange}>
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Nonaktif</SelectItem>
                <SelectItem value="30">30 detik</SelectItem>
                <SelectItem value="60">60 detik</SelectItem>
                <SelectItem value="120">120 detik</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════
          SECTION 3: DATA MANAGEMENT
          ═══════════════════════════════════════════════════ */}
      <Card className="border-0 shadow-lg overflow-hidden glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9DB1CC] to-[#7E95B3] flex items-center justify-center shadow-lg shadow-[#9DB1CC]/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Manajemen Data</CardTitle>
              <p className="text-[10px] text-muted-foreground">Backup dan hapus semua data</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Export All Data */}
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#F0D5C5]/50 dark:bg-[#1A1A1B]/20 border border-[#E6BAA3]/50 dark:border-[#B8321E]/30">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#F0D5C5] dark:bg-[#B8321E]/40 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-[#B8321E] dark:text-[#F07050]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Export Semua Data</p>
                <p className="text-[10px] text-muted-foreground truncate">Unduh backup JSON (sales, crew, group)</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs shrink-0"
              onClick={handleExportAll}
              disabled={exportingData}
            >
              {exportingData ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Mengunduh...</>
              ) : (
                <><Download className="w-3.5 h-3.5 mr-1.5" />Export</>
              )}
            </Button>
          </div>

          {/* Clear All Data */}
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">Hapus Semua Data</p>
                <p className="text-[10px] text-muted-foreground truncate">Hapus seluruh data dari sistem</p>
              </div>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs shrink-0 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-500/20"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />Hapus
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════
          SECTION 4: SECURITY
          ═══════════════════════════════════════════════════ */}
      <Card className="border-0 shadow-lg overflow-hidden glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Keamanan</CardTitle>
              <p className="text-[10px] text-muted-foreground">Ubah password dan info sesi</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Change Password Form */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Ubah Password</p>
            </div>

            <div className="space-y-2">
              {/* Current Password */}
              <div className="relative">
                <Label htmlFor="settings-current-pw" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Password Lama</Label>
                <div className="relative mt-1">
                  <Input
                    id="settings-current-pw"
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="Masukkan password lama"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="h-9 pr-9 text-xs"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    aria-label="Toggle password visibility"
                  >
                    {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="relative">
                <Label htmlFor="settings-new-pw" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Password Baru</Label>
                <div className="relative mt-1">
                  <Input
                    id="settings-new-pw"
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="h-9 pr-9 text-xs"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowNewPw(!showNewPw)}
                    aria-label="Toggle password visibility"
                  >
                    {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="settings-confirm-pw" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Konfirmasi Password Baru</Label>
                <Input
                  id="settings-confirm-pw"
                  type="password"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="h-9 mt-1 text-xs"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />Password tidak cocok
                  </p>
                )}
              </div>

              <Button
                size="sm"
                className="w-full h-9 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-md shadow-rose-500/20 text-xs font-semibold"
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Mengubah...</>
                ) : (
                  <><Save className="w-3.5 h-3.5 mr-1.5" />Ubah Password</>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Session Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Info Sesi</p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Login sebagai</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold">{adminName || 'Admin'}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Berlaku hingga</span>
                </div>
                <span className="text-[10px] font-medium text-foreground text-right max-w-[200px] truncate">7 hari dari login</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Waktu login</span>
                </div>
                <span className="text-[10px] font-medium text-foreground text-right max-w-[200px] truncate">{loginTime}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Sesi berakhir</span>
                </div>
                <span className="text-[10px] font-medium text-foreground text-right max-w-[200px] truncate">{getExpiryDate()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════
          CLEAR DATA CONFIRMATION DIALOG
          ═══════════════════════════════════════════════════ */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-3">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Hapus Semua Data?</AlertDialogTitle>
            <AlertDialogDescription className="text-center" asChild>
              <div>
                <p className="text-sm">
                  <span className="font-semibold text-red-600 dark:text-red-400">⚠️ Semua data penjualan, crew, dan group akan dihapus.</span>
                </p>
                <p className="text-sm mt-1">Tindakan ini tidak dapat dibatalkan!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="mt-0 sm:mt-0">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-500/20"
              onClick={(e) => {
                e.preventDefault()
                handleClearAll()
              }}
              disabled={clearingData}
            >
              {clearingData ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Menghapus...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-1.5" />Ya, Hapus Semua</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
