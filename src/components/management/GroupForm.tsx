'use client'

import React, { useState } from 'react'
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { Group } from '@/lib/cms-types'

export default function GroupForm({ group, onSave, onCancel }: {
  group?: Group
  onSave: (data: { name: string; logo: string; monthlyTarget: number; week1Target: number; week2Target: number; week3Target: number; week4Target: number }) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: group?.name || '',
    logo: group?.logo || '',
    monthlyTarget: group?.monthlyTarget?.toString() || '',
    week1Target: group?.week1Target?.toString() || '20',
    week2Target: group?.week2Target?.toString() || '25',
    week3Target: group?.week3Target?.toString() || '25',
    week4Target: group?.week4Target?.toString() || '30',
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{group ? 'Edit Group' : 'Tambah Group Baru'}</DialogTitle>
        <DialogDescription>Atur target penjualan mingguan dan bulanan</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label>Nama Group</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Zone A - Premium" /></div>
        <div className="space-y-2"><Label>Logo (URL)</Label><Input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="https://..." /></div>
        <div className="space-y-2"><Label>Target Bulanan (Rp)</Label><Input type="number" value={form.monthlyTarget} onChange={e => setForm({ ...form, monthlyTarget: e.target.value })} placeholder="50000000" /></div>
        <Separator />
        <p className="text-sm font-medium">Target Mingguan (%)</p>
        <div className="grid grid-cols-4 gap-3">
          {['week1Target', 'week2Target', 'week3Target', 'week4Target'].map((key, i) => (
            <div key={key} className="space-y-1 text-center">
              <Label className="text-[10px]">W{i + 1} ({(i * 7 + 1)}–{Math.min((i + 1) * 7, 31)})</Label>
              <Input type="number" value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="text-center h-9" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Total: {Number(form.week1Target || 0) + Number(form.week2Target || 0) + Number(form.week3Target || 0) + Number(form.week4Target || 0)}%</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button onClick={() => onSave({
          name: form.name,
          logo: form.logo,
          monthlyTarget: Number(form.monthlyTarget) || 0,
          week1Target: Number(form.week1Target) || 0,
          week2Target: Number(form.week2Target) || 0,
          week3Target: Number(form.week3Target) || 0,
          week4Target: Number(form.week4Target) || 0,
        })} disabled={!form.name} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {group ? 'Simpan Perubahan' : 'Tambah Group'}
        </Button>
      </DialogFooter>
    </>
  )
}
