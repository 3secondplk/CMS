'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2 } from 'lucide-react'
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" /> Konfirmasi Hapus
          </DialogTitle>
          <DialogDescription>
            {"Apakah Anda yakin ingin menghapus "}
            <strong>{deleteConfirm?.name}</strong>
            {"?"}
            {deleteConfirm?.type === 'group' && (
              <span className="block mt-1 text-red-500">
                Semua crew dalam group ini juga akan dihapus.
              </span>
            )}
            {deleteConfirm?.type === 'sale' && (
              <span className="block mt-1 text-red-500">
                Data penjualan ini akan dihapus secara permanen.
              </span>
            )}
            {deleteConfirm?.type === 'batch-sale' && (
              <span className="block mt-1 text-red-500">
                {deleteConfirm.ids?.length || 0} data penjualan terpilih akan dihapus secara permanen.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Batal</Button>
          <Button
            variant="destructive"
            disabled={batchDeleting}
            onClick={onConfirmDelete}
          >
            <Trash2 className="w-4 h-4 mr-1" /> {batchDeleting ? 'Menghapus...' : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
