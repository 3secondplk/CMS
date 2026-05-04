'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Edit2, AlertTriangle, CalendarDays, Hash, DollarSign, Building2, Tag, Layers, CreditCard, Award, Save, Users } from 'lucide-react'
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
  } | ((prev: {
    tanggal: string; kodeExtend: string; qty: number; settle: number;
    dept: string; brand: string; modul: string; pembayaran: string; program: string; crewId: string;
  }) => {
    tanggal: string; kodeExtend: string; qty: number; settle: number;
    dept: string; brand: string; modul: string; pembayaran: string; program: string; crewId: string;
  })) => void
  editSaleSaving: boolean
  onSave: () => void
  crews: Crew[]
}

export default function EditSaleDialog({
  editSaleDialog, setEditSaleDialog, editSaleForm, setEditSaleForm, editSaleSaving, onSave, crews,
}: EditSaleDialogProps) {
  return (
    <Dialog open={!!editSaleDialog} onOpenChange={() => setEditSaleDialog(null)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 dialog-header-gradient">
        {/* Gradient icon header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Edit2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Edit Data Penjualan</DialogTitle>
              <DialogDescription className="text-xs">Ubah data penjualan atau pindahkan ke crew lain</DialogDescription>
            </div>
          </div>
        </div>

        {editSaleDialog && (
          <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-6 space-y-4">

            {/* ─── CREW ASSIGNMENT SECTION ─── */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crew (Claim)</Label>
              </div>
              <Select value={editSaleForm.crewId} onValueChange={v => setEditSaleForm(f => ({ ...f, crewId: v }))}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Pilih crew..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs">✕</span>
                      </div>
                      <span className="text-muted-foreground text-sm">Belum di-claim (Unclaim)</span>
                    </div>
                  </SelectItem>
                  {crews.map(c => (
                    <SelectItem key={c.id} value={c.id} className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={c.photo || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-[9px] font-bold">
                            {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground">{c.employeeId} · {c.group?.name}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Warning box for unclaim action */}
              {editSaleDialog.crew && editSaleForm.crewId === '__none__' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 px-3.5 py-2.5 flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    Data akan di-unclaim dari <strong>{editSaleDialog.crew.name}</strong>. Sale ini akan kembali ke daftar unclaimed.
                  </p>
                </motion.div>
              )}
            </div>

            <Separator className="opacity-60" />

            {/* ─── PRODUCT DETAILS SECTION ─── */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detail Produk</Label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Tanggal
                  </Label>
                  <Input type="date" value={editSaleForm.tanggal} onChange={e => setEditSaleForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Qty
                  </Label>
                  <Input type="number" min={0} value={editSaleForm.qty} onChange={e => setEditSaleForm(f => ({ ...f, qty: Number(e.target.value) || 0 }))} className="h-9 text-sm tabular-nums" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Settle (Rp)
                  </Label>
                  <Input type="number" min={0} step={0.01} value={editSaleForm.settle} onChange={e => setEditSaleForm(f => ({ ...f, settle: Number(e.target.value) || 0 }))} className="h-9 text-sm font-mono tabular-nums" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-3">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Kode Extend
                  </Label>
                  <Input value={editSaleForm.kodeExtend} onChange={e => setEditSaleForm(f => ({ ...f, kodeExtend: e.target.value }))} className="h-9 text-sm font-mono" />
                </div>
              </div>
            </div>

            <Separator className="opacity-60" />

            {/* ─── CLASSIFICATION SECTION ─── */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Klasifikasi</Label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Dept</Label>
                  <Input value={editSaleForm.dept} onChange={e => setEditSaleForm(f => ({ ...f, dept: e.target.value }))} placeholder="Departemen" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Brand</Label>
                  <Input value={editSaleForm.brand} onChange={e => setEditSaleForm(f => ({ ...f, brand: e.target.value }))} placeholder="Brand" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs text-muted-foreground">Modul</Label>
                  <Input value={editSaleForm.modul} onChange={e => setEditSaleForm(f => ({ ...f, modul: e.target.value }))} placeholder="Modul" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Pembayaran
                  </Label>
                  <Input value={editSaleForm.pembayaran} onChange={e => setEditSaleForm(f => ({ ...f, pembayaran: e.target.value }))} placeholder="Metode pembayaran" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Award className="w-3 h-3" /> Program
                  </Label>
                  <Input value={editSaleForm.program} onChange={e => setEditSaleForm(f => ({ ...f, program: e.target.value }))} placeholder="Program" className="h-9 text-sm" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-5">
          <DialogFooter className="flex-row gap-2.5">
            <Button
              variant="outline"
              onClick={() => setEditSaleDialog(null)}
              className="flex-1 h-10 text-sm font-medium border-border/60 bg-muted/30 hover:bg-muted/60 transition-all duration-200"
            >
              Batal
            </Button>
            <Button
              className="flex-1 h-10 text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200 disabled:opacity-40 disabled:shadow-none"
              disabled={editSaleSaving || !editSaleForm.kodeExtend || !editSaleForm.tanggal}
              onClick={onSave}
            >
              {editSaleSaving ? (
                <>
                  <motion.div
                    className="w-4 h-4 mr-1.5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
