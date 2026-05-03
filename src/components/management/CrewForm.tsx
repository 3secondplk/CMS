'use client'

import React, { useState } from 'react'
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Crew, Group } from '@/lib/cms-types'

export default function CrewForm({ crew, groups, onSave, onCancel }: {
  crew?: Crew; groups: Group[]
  onSave: (data: { name: string; photo: string; employeeId: string; groupId: string }) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: crew?.name || '',
    photo: crew?.photo || '',
    employeeId: crew?.employeeId || '',
    groupId: crew?.groupId || crew?.group?.id || '',
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{crew ? 'Edit Crew' : 'Tambah Crew Baru'}</DialogTitle>
        <DialogDescription>Isi data crew yang akan ditambahkan</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label>Nama</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" /></div>
        <div className="space-y-2"><Label>Foto (URL)</Label><Input value={form.photo} onChange={e => setForm({ ...form, photo: e.target.value })} placeholder="https://..." /></div>
        <div className="space-y-2"><Label>ID Karyawan</Label><Input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} placeholder="EMP001" /></div>
        <div className="space-y-2">
          <Label>Group / Zoning</Label>
          <Select value={form.groupId} onValueChange={v => setForm({ ...form, groupId: v })}>
            <SelectTrigger><SelectValue placeholder="Pilih group..." /></SelectTrigger>
            <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || !form.employeeId || !form.groupId} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {crew ? 'Simpan Perubahan' : 'Tambah Crew'}
        </Button>
      </DialogFooter>
    </>
  )
}
