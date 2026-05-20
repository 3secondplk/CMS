'use client'

import React, { useState, useRef, useCallback } from 'react'
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, User, Image as ImageIcon, BadgeCheck, Users, Save, AlertCircle, Camera, X, UploadCloud, Loader2, Tag } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { Crew, Group } from '@/lib/cms-types'

// ─── Group color palette (matches ManagementTab) ────────────
const groupDotColors = [
  'bg-[#E14227]',
  'bg-[#E6BAA3]',
  'bg-[#9DB1CC]',
  'bg-[#B2AC88]',
  'bg-[#D4956B]',
  'bg-[#8F8B6E]',
]
function getGroupDotColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return groupDotColors[Math.abs(hash) % groupDotColors.length]
}

// ─── Image compression utility ─────────────────────────────
const MAX_ORIGINAL_SIZE = 200 * 1024 // 200KB — compress if larger
const MAX_ALLOWED_SIZE = 500 * 1024  // 500KB — warn if larger
const MAX_DIMENSION = 200
const JPEG_QUALITY = 0.8

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        // Only compress if file > 200KB or dimensions > 200px
        if (file.size <= MAX_ORIGINAL_SIZE && img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) {
          // Already small enough, return raw base64
          resolve(reader.result as string)
          return
        }

        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height

        // Scale down to max 200x200 preserving aspect ratio
        if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
          if (w > h) {
            h = Math.round((h * MAX_DIMENSION) / w)
            w = MAX_DIMENSION
          } else {
            w = Math.round((w * MAX_DIMENSION) / h)
            h = MAX_DIMENSION
          }
        }

        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas context error')); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// ─── CrewForm Component ────────────────────────────────────
export default function CrewForm({ crew, groups, onSave, onCancel }: {
  crew?: Crew; groups: Group[]
  onSave: (data: { name: string; photo: string; employeeId: string; groupId: string; label: string; removePhoto?: boolean }) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: crew?.name || '',
    photo: crew?.photo || '',
    employeeId: crew?.employeeId || '',
    groupId: crew?.groupId || crew?.group?.id || '',
    label: crew?.label || 'Crew',
  })
  const [touched, setTouched] = useState(false)
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  // Determine effective photo source: uploadedPhoto (base64) > URL > null
  const effectivePhoto = removePhoto ? null : (uploadedPhoto || form.photo || null)
  const hasPhoto = !!effectivePhoto

  // Process file: read, compress, and store base64
  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setFileSizeWarning('File harus berupa gambar (JPG, PNG, dll)')
      return
    }

    // Check size warning for > 500KB original
    if (file.size > MAX_ALLOWED_SIZE) {
      setFileSizeWarning('File terlalu besar, ukuran maksimal 500KB')
      return
    } else {
      setFileSizeWarning(null)
    }

    setUploading(true)
    try {
      const base64 = await compressImage(file)
      setUploadedPhoto(base64)
      setRemovePhoto(false)
    } catch {
      setFileSizeWarning('Gagal memproses gambar. Coba file lain.')
    } finally {
      setUploading(false)
    }
  }, [])

  // File input change handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [processFile])

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  // Remove photo handler
  const handleRemovePhoto = useCallback(() => {
    setUploadedPhoto(null)
    setRemovePhoto(true)
    setForm(prev => ({ ...prev, photo: '' }))
    setFileSizeWarning(null)
  }, [])

  const handleSubmit = () => {
    setTouched(true)
    if (!form.name || !form.employeeId || !form.groupId) return

    const photoData = removePhoto ? '' : (uploadedPhoto || form.photo)
    onSave({ ...form, photo: photoData, removePhoto: removePhoto && !uploadedPhoto })
  }

  const isFieldError = (field: string) => touched && !form[field as keyof typeof form]

  return (
    <>
      <DialogHeader className="dialog-header-gradient pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E14227] to-[#D4956B] flex items-center justify-center shadow-lg shadow-[#E14227]/25 flex-shrink-0">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <DialogTitle className="text-lg">{crew ? 'Edit Crew' : 'Tambah Crew Baru'}</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              {crew ? 'Perbarui informasi crew yang sudah terdaftar' : 'Isi data crew yang akan ditambahkan ke sistem'}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-3">
        {/* Name Field */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#E14227]" />
            Nama <span className="text-destructive text-[10px]">*</span>
          </Label>
          <div className="relative">
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nama lengkap crew..."
              className={`pl-9 transition-colors ${isFieldError('name') ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
            />
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
            {isFieldError('name') && (
              <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Nama wajib diisi
              </p>
            )}
          </div>
        </div>

        {/* Label / Jabatan Field */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#E14227]" />
            Jabatan / Label
          </Label>
          <div className="relative">
            <Input
              value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })}
              placeholder="Crew, Cashier, SPV, PIC..."
              className="pl-9 text-sm"
              maxLength={50}
            />
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Label jabatan crew, misal: Crew, Cashier, SPV, PIC
          </p>
        </div>

        {/* Photo Upload Section with Drag & Drop */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#E14227]" />
            Foto
          </Label>

          {/* Drag & Drop Zone + Photo Preview */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative rounded-lg border-2 border-dashed transition-all duration-200 ${
              isDragging
                ? 'border-[#F07050] bg-[#F0D5C5]/80 dark:bg-[#1A1A1B]/30 scale-[1.01]'
                : hasPhoto
                  ? 'border-transparent bg-muted/30'
                  : 'border-muted-foreground/25 hover:border-[#E6BAA3] hover:bg-muted/20'
            } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
          >
            {hasPhoto ? (
              /* ─── Photo Preview ─── */
              <div className="relative flex items-center gap-4 p-3">
                <div className="relative group">
                  <Avatar className="w-14 h-14 ring-2 ring-[#E6BAA3] dark:ring-[#B8321E] ring-offset-1 shadow-md">
                    <AvatarImage src={effectivePhoto!} alt="Preview" className="object-cover" />
                    <AvatarFallback className="text-sm bg-gradient-to-br from-[#E14227] to-[#D4956B] text-white font-bold">
                      {form.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Remove button overlay on hover */}
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                    aria-label="Hapus Foto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {uploadedPhoto ? 'Foto berhasil diunggah' : 'Foto dari URL'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {uploadedPhoto ? 'Klik ikon kamera atau seret foto baru untuk mengganti' : 'Masukkan URL atau unggah dari perangkat'}
                  </p>
                </div>
                {/* Replace photo button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-lg bg-[#F0D5C5] dark:bg-[#B8321E]/50 text-[#B8321E] dark:text-[#F07050] flex items-center justify-center hover:bg-[#E6BAA3] dark:hover:bg-[#B8321E]/80 transition-colors flex-shrink-0"
                  aria-label="Ganti Foto"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* ─── Empty Drop Zone ─── */
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-1.5 py-5 cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-[#E6BAA3] dark:bg-[#B8321E]' : 'bg-muted'
                }`}>
                  <UploadCloud className={`w-5 h-5 transition-colors ${
                    isDragging ? 'text-[#B8321E] dark:text-[#F07050]' : 'text-muted-foreground/60'
                  }`} />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-medium transition-colors ${
                    isDragging ? 'text-[#B8321E] dark:text-[#F07050]' : 'text-foreground'
                  }`}>
                    {isDragging ? 'Lepaskan foto di sini' : 'Unggah Foto'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isDragging ? '' : 'Seret foto ke sini atau klik untuk memilih'}
                  </p>
                </div>
              </button>
            )}

            {/* Uploading overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-xs text-[#B8321E] dark:text-[#F07050]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses foto...</span>
                </div>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File size warning */}
          {fileSizeWarning && (
            <p className="text-[11px] text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {fileSizeWarning}
            </p>
          )}

          {/* Photo URL fallback field */}
          <div className="relative">
            <Input
              value={form.photo}
              onChange={e => {
                setForm({ ...form, photo: e.target.value })
                // Clear uploaded photo when URL is manually changed
                if (uploadedPhoto) {
                  setUploadedPhoto(null)
                  setRemovePhoto(false)
                }
              }}
              placeholder="https://example.com/photo.jpg (opsional)"
              className="pl-9 text-xs"
            />
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Unggah foto dari perangkat atau masukkan URL gambar sebagai alternatif
          </p>
        </div>

        {/* Employee ID Field */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5 text-[#E14227]" />
            ID Karyawan <span className="text-destructive text-[10px]">*</span>
          </Label>
          <div className="relative">
            <Input
              value={form.employeeId}
              onChange={e => setForm({ ...form, employeeId: e.target.value })}
              placeholder="EMP001"
              className={`pl-9 font-mono text-sm ${isFieldError('employeeId') ? 'border-destructive focus:border-destructive focus:ring-destructive/20' : ''}`}
            />
            <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
            {isFieldError('employeeId') && (
              <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> ID Karyawan wajib diisi
              </p>
            )}
          </div>
        </div>

        {/* Group Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#E14227]" />
            Group / Zoning <span className="text-destructive text-[10px]">*</span>
          </Label>
          <Select value={form.groupId} onValueChange={v => setForm({ ...form, groupId: v })}>
            <SelectTrigger className={`w-full ${isFieldError('groupId') ? 'border-destructive focus:ring-destructive/20' : ''}`}>
              <SelectValue placeholder="Pilih group..." />
            </SelectTrigger>
            <SelectContent>
              {groups.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                  Belum ada group tersedia
                </div>
              )}
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 w-full">
                    <span className={`w-2.5 h-2.5 rounded-full ${getGroupDotColor(g.name)} flex-shrink-0 shadow-sm`} />
                    <span>{g.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{g.crewCount || 0} crew</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isFieldError('groupId') && (
            <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Pilih group terlebih dahulu
            </p>
          )}
        </div>
      </div>

      <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0 sm:justify-between">
        <p className="text-[10px] text-muted-foreground order-2 sm:order-1">
          <span className="text-destructive">*</span> Field wajib diisi
        </p>
        <div className="flex items-center gap-2 order-1 sm:order-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="text-xs hover:bg-muted/80"
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.name || !form.employeeId || !form.groupId || uploading}
            className="bg-gradient-to-r from-[#B8321E] to-[#9DB1CC] hover:from-[#B8321E] hover:to-[#7E95B3] text-white shadow-md shadow-[#E14227]/25 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all text-xs"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                {crew ? 'Simpan Perubahan' : 'Tambah Crew'}
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
