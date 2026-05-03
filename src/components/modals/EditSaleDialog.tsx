'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Edit2, AlertTriangle } from 'lucide-react'
import type { ClaimSale, Crew } from '@/lib/cms-types'

interface EditSaleDialogProps {
  editSaleDialog: ClaimSale | null
  setEditSaleDialog: (s: ClaimSale | null) => void
  editSaleForm: {
    tanggal: string; kodeExtend: string; qty: number; settle: number;
    dept: string; brand: string; modul: string; pembayaran: string; program: string; crewId: string;
  }
  setEditSaleForm: (f: {
    tanggal: string; kodeExtend: string; qty: number; settle: number;
    dept: string; brand: string; modul: string; pembayaran: string; program: string; crewId: string;
  }) => void
  editSaleSaving: boolean
  onSave: () => void
  crews: Crew[]
}

export default function EditSaleDialog({
  editSaleDialog, setEditSaleDialog, editSaleForm, setEditSaleForm, editSaleSaving, onSave, crews,
}: EditSaleDialogProps) {
  return (
    <Dialog open={!!editSaleDialog} onOpenChange={() => setEditSaleDialog(null)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-blue-500" />
            Edit Data Penjualan
          </DialogTitle>
          <DialogDescription>Ubah data penjualan atau pindahkan ke crew lain</DialogDescription>
        </DialogHeader>
        {editSaleDialog && (
          <div className="space-y-4">
            {/* Crew assignment */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crew (Claim)</Label>
              <Select value={editSaleForm.crewId} onValueChange={v => setEditSaleForm(f => ({ ...f, crewId: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih crew..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Belum di-claim (Unclaim) —</SelectItem>
                  {crews.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.employeeId})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editSaleDialog.crew && editSaleForm.crewId === '__none__' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Data akan di-unclaim dari {editSaleDialog.crew.name}</p>
              )}
            </div>
            <Separator />
            {/* Product details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tanggal</Label>
                <Input type="date" value={editSaleForm.tanggal} onChange={e => setEditSaleForm(f => ({ ...f, tanggal: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Qty</Label>
                <Input type="number" min={0} value={editSaleForm.qty} onChange={e => setEditSaleForm(f => ({ ...f, qty: Number(e.target.value) || 0 }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Kode Extend</Label>
                <Input value={editSaleForm.kodeExtend} onChange={e => setEditSaleForm(f => ({ ...f, kodeExtend: e.target.value }))} className="font-mono" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Settle (Rp)</Label>
                <Input type="number" min={0} step={0.01} value={editSaleForm.settle} onChange={e => setEditSaleForm(f => ({ ...f, settle: Number(e.target.value) || 0 }))} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dept</Label>
                <Input value={editSaleForm.dept} onChange={e => setEditSaleForm(f => ({ ...f, dept: e.target.value }))} placeholder="Departemen" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Brand</Label>
                <Input value={editSaleForm.brand} onChange={e => setEditSaleForm(f => ({ ...f, brand: e.target.value }))} placeholder="Brand" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Modul</Label>
                <Input value={editSaleForm.modul} onChange={e => setEditSaleForm(f => ({ ...f, modul: e.target.value }))} placeholder="Modul" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pembayaran</Label>
                <Input value={editSaleForm.pembayaran} onChange={e => setEditSaleForm(f => ({ ...f, pembayaran: e.target.value }))} placeholder="Metode pembayaran" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Program</Label>
                <Input value={editSaleForm.program} onChange={e => setEditSaleForm(f => ({ ...f, program: e.target.value }))} placeholder="Program" />
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setEditSaleDialog(null)}>Batal</Button>
          <Button
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25"
            disabled={editSaleSaving || !editSaleForm.kodeExtend || !editSaleForm.tanggal}
            onClick={onSave}
          >
            {editSaleSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
