'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle, Package, DollarSign, Star } from 'lucide-react'
import { fmtRp, fmtNum } from '@/lib/cms-utils'

interface UploadModalProps {
  showUploadModal: boolean
  setShowUploadModal: (v: boolean) => void
  uploading: boolean
  uploadProgress: number
  uploadResult: { totalRows: number; totalQty: number; totalSettle: number; uniqueProducts: number; duplicateRows?: number } | null
  isDragOver: boolean
  setIsDragOver: (v: boolean) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleDropFile: (file: File) => void
}

export default function UploadModal({
  showUploadModal, setShowUploadModal, uploading, uploadProgress, uploadResult,
  isDragOver, setIsDragOver, fileInputRef, handleFileUpload, handleDropFile,
}: UploadModalProps) {
  return (
    <Dialog open={showUploadModal} onOpenChange={open => { setShowUploadModal(open); if (!open) { setIsDragOver(false) } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E14227] to-[#7E95B3] flex items-center justify-center shadow-md shadow-[#E14227]/20">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            Upload Laporan Penjualan
          </DialogTitle>
          <DialogDescription>Upload file Excel (.xlsx/.xls) — data akan otomatis diimpor sebagai unclaimed</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-5 sm:p-8 text-center transition-all cursor-pointer ${
              isDragOver
                ? 'border-[#E14227] bg-[#F0D5C5] dark:bg-[#3A0D0A]/30 shadow-lg shadow-[#E14227]/20 animate-shimmer-border-intense drop-zone-drag-active'
                : 'border-muted-foreground/25 hover:border-[#F07050] hover:bg-muted/30 animate-shimmer-border drop-zone-pulse'
            }`}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setIsDragOver(false)
              const file = e.dataTransfer.files?.[0]
              if (file) handleDropFile(file)
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            <motion.div animate={isDragOver ? { y: -4 } : { y: 0 }}>
              <div className={`w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                isDragOver ? 'bg-[#F0D5C5] dark:bg-[#3A0D0A]' : 'bg-muted'
              }`}>
                <UploadCloud className={`w-6 h-6 sm:w-7 sm:h-7 ${isDragOver ? 'text-[#E14227]' : 'text-muted-foreground'}`} />
              </div>
              <p className="text-sm font-medium">Drag & drop file Excel di sini</p>
              <p className="text-xs text-muted-foreground mt-1">atau klik untuk memilih file (.xlsx, .xls)</p>
            </motion.div>
          </div>

          {uploading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-[#F0D5C5] dark:bg-[#3A0D0A]/30 border border-[#E6BAA3] dark:border-[#7A1A14] space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-[#E14227] border-t-transparent rounded-full animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#B8321E] dark:text-[#F07050]">Mengimport data Excel...</p>
                  <p className="text-xs text-[#B8321E]/70 dark:text-[#F07050]/70">
                    {uploadProgress < 30 ? 'Membaca file...' : uploadProgress < 70 ? 'Memproses data...' : uploadProgress < 100 ? 'Menyimpan ke database...' : 'Selesai!'}
                  </p>
                </div>
                <span className="text-sm font-bold text-[#B8321E] dark:text-[#F07050] tabular-nums">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full h-2 bg-[#E6BAA3] dark:bg-[#3A0D0A] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#E14227] to-[#F07050] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(uploadProgress, 100)}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}

          {uploadResult && !uploading && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`p-4 rounded-xl ${uploadResult.totalRows === 0 && uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800' : 'bg-[#F0D5C5] dark:bg-[#3A0D0A]/20 border border-[#E6BAA3] dark:border-[#7A1A14]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${uploadResult.totalRows === 0 && uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? 'bg-amber-100 dark:bg-amber-900' : 'bg-[#F0D5C5] dark:bg-[#3A0D0A]'}`}>
                  {uploadResult.totalRows === 0 && uploadResult.duplicateRows && uploadResult.duplicateRows > 0
                    ? <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    : <CheckCircle2 className="w-5 h-5 text-[#B8321E] dark:text-[#F07050]" />
                  }
                </div>
                <div>
                  <p className={`text-sm font-semibold ${uploadResult.totalRows === 0 && uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-[#B8321E] dark:text-[#F07050]'}`}>
                    {uploadResult.totalRows === 0 && uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? 'Semua Data Duplikat' : 'Import Berhasil!'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {uploadResult.duplicateRows && uploadResult.duplicateRows > 0
                      ? `${uploadResult.totalRows} data baru diimpor, ${uploadResult.duplicateRows} duplikat dilewati`
                      : `${uploadResult.totalRows} row data berhasil diimpor`
                    }
                  </p>
                </div>
              </div>
              <div className={`grid gap-2 ${uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
                {[
                  { label: 'Data Baru', value: fmtNum(uploadResult.totalRows), icon: FileSpreadsheet, color: '' },
                  { label: 'Total Qty', value: fmtNum(uploadResult.totalQty), icon: Package, color: '' },
                  { label: 'Total Settle', value: fmtRp(uploadResult.totalSettle), icon: DollarSign, color: '' },
                  { label: 'Produk Unik', value: fmtNum(uploadResult.uniqueProducts), icon: Star, color: '' },
                  ...(uploadResult.duplicateRows && uploadResult.duplicateRows > 0 ? [{ label: 'Duplikat Dilewati', value: fmtNum(uploadResult.duplicateRows), icon: AlertTriangle, color: 'ring-2 ring-amber-300 dark:ring-amber-700' }] : []),
                ].map((stat, i) => (
                  <div key={i} className={`bg-white/60 dark:bg-gray-900/60 rounded-lg p-2.5 text-center ${stat.color || ''}`}>
                    <stat.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${stat.color ? 'text-amber-500' : 'text-[#E14227]'}`} />
                    <p className={`text-xs font-bold ${stat.color ? 'text-amber-700 dark:text-amber-300' : 'text-[#B8321E] dark:text-[#E6BAA3]'}`}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowUploadModal(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
