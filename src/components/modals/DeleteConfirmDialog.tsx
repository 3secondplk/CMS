'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import type { DeleteConfirmState } from '@/lib/cms-types'

interface DeleteConfirmDialogProps {
  deleteConfirm: DeleteConfirmState | null
  setDeleteConfirm: (v: DeleteConfirmState | null) => void
  batchDeleting: boolean
  onConfirmDelete: () => void
}

export default function DeleteConfirmDialog({ deleteConfirm, setDeleteConfirm, batchDeleting, onConfirmDelete }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Red gradient header stripe */}
        <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

        <div className="px-5 sm:px-6 pt-4 sm:pt-5 pb-5 sm:pb-6 space-y-4">
          {/* Animated warning icon with pulse ring */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Animated pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full bg-red-400/30"
                animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-red-400/20"
                animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              />
              {/* Icon container */}
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30"
              >
                <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
              </motion.div>
            </div>
          </div>

          {/* Title */}
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
              Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription className="text-sm">
              {"Apakah Anda yakin ingin menghapus item berikut?"}
            </DialogDescription>
          </DialogHeader>

          {/* Item name in highlighted badge */}
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center"
            >
              <Badge className="px-4 py-1.5 text-sm font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 rounded-lg">
                {deleteConfirm.name}
              </Badge>
            </motion.div>
          )}

          {/* Warning text in tinted red box */}
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/30 px-4 py-3 space-y-1.5"
            >
              {deleteConfirm.type === 'group' && (
                <p className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  <span>Semua crew dalam group ini <strong>juga akan dihapus</strong>. Tindakan ini tidak dapat dibatalkan.</span>
                </p>
              )}
              {deleteConfirm.type === 'sale' && (
                <p className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  <span>Data penjualan ini akan dihapus <strong>secara permanen</strong>. Tindakan ini tidak dapat dibatalkan.</span>
                </p>
              )}
              {deleteConfirm.type === 'crew' && (
                <p className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  <span>Data crew ini akan dihapus <strong>secara permanen</strong> beserta semua data terkait.</span>
                </p>
              )}
              {deleteConfirm.type === 'batch-sale' && (
                <p className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  <span><strong className="font-bold tabular-nums">{deleteConfirm.ids?.length || 0}</strong> data penjualan terpilih akan dihapus <strong>secara permanen</strong>.</span>
                </p>
              )}
            </motion.div>
          )}

          {/* Action buttons */}
          <DialogFooter className="flex-row gap-2.5 pt-1">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 h-11 text-sm font-medium border-border/60 bg-muted/30 hover:bg-muted/60 hover:text-foreground transition-all duration-200"
            >
              <X className="w-4 h-4 mr-1.5" />
              Batal
            </Button>
            <Button
              disabled={batchDeleting}
              onClick={onConfirmDelete}
              className="flex-1 h-11 text-sm font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/35 transition-all duration-200 disabled:opacity-40 disabled:shadow-none"
            >
              {batchDeleting ? (
                <>
                  <motion.div
                    className="w-4 h-4 mr-1.5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Hapus
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
