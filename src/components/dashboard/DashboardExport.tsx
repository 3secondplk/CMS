'use client'

import React, { useCallback } from 'react'
import { Download, Copy, Image as ImageIcon, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getWIBDate } from '@/lib/cms-utils'
import type { DashboardData } from '@/lib/cms-types'

interface DashboardExportProps {
  dashboard: DashboardData
  dashPeriod: string
}

/** Format a number as Rp currency string (plain, for clipboard text) */
function fmtRpText(n: number): string {
  return 'Rp ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(n)
}

/** Build a formatted text summary from dashboard data */
function buildSummaryText(dashboard: DashboardData, dashPeriod: string): string {
  const wib = getWIBDate()
  const dateStr = wib.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Skip summary for achievement period
  if (dashPeriod === 'achievement') {
    const sorted = [...dashboard.crewStats].sort((a, b) => b.crewMonthlyAchievement - a.crewMonthlyAchievement)
    const totalCrew = dashboard.crewStats.length
    const topCrew = sorted[0]
    const lines: string[] = [
      '📊 CMS Crew Management System',
      '📅 ' + dateStr,
      '',
      '🏆 Leaderboard Achievement Bulanan:',
    ]
    if (topCrew) {
      lines.push(`  1. ${topCrew.name} — ${Math.round(topCrew.crewMonthlyAchievement)}% (${fmtRpText(topCrew.monthTotal)})`)
    }
    if (sorted.length > 1) {
      lines.push(`  2. ${sorted[1].name} — ${Math.round(sorted[1].crewMonthlyAchievement)}% (${fmtRpText(sorted[1].monthTotal)})`)
    }
    if (sorted.length > 2) {
      lines.push(`  3. ${sorted[2].name} — ${Math.round(sorted[2].crewMonthlyAchievement)}% (${fmtRpText(sorted[2].monthTotal)})`)
    }
    lines.push(``, `👥 Total Crew Aktif: ${totalCrew}`)
    if (dashboard.groupAchievements.length > 0) {
      lines.push('', '🏢 Group Achievement:')
      for (const group of dashboard.groupAchievements) {
        const pct = Math.round(group.monthlyAchievement)
        lines.push(`  • ${group.name}: ${pct}% dari target ${fmtRpText(group.monthlyTarget)}`)
      }
    }
    return lines.join('\n')
  }

  const periodLabel =
    dashPeriod === 'today' ? 'Hari Ini' : dashPeriod === 'week' ? 'Minggu Ini' : 'Bulan Ini'
  const periodVal =
    dashPeriod === 'today' ? dashboard.totals.today : dashPeriod === 'week' ? dashboard.totals.week : dashboard.totals.month
  const periodQty =
    dashPeriod === 'today' ? dashboard.totals.todayQty : dashPeriod === 'week' ? dashboard.totals.weekQty : dashboard.totals.monthQty

  const totalCrew = dashboard.crewStats.length

  const topCrew = dashPeriod === 'achievement'
    ? [...dashboard.crewStats].sort((a, b) => b.crewMonthlyAchievement - a.crewMonthlyAchievement)[0]
    : dashboard.topCrews[0]

  const lines: string[] = [
    '📊 CMS Crew Management System',
    '📅 ' + dateStr,
    '',
    '💰 Total Penjualan ' + periodLabel + ': ' + fmtRpText(periodVal),
    '📦 Total Items: ' + periodQty.toLocaleString('id-ID'),
    '👥 Total Crew Aktif: ' + totalCrew,
  ]

  if (topCrew) {
    const topVal =
      dashPeriod === 'achievement' ? topCrew.crewMonthlyAchievement : dashPeriod === 'today' ? topCrew.todayTotal : dashPeriod === 'week' ? topCrew.weekTotal : topCrew.monthTotal
    lines.push('🏆 Top Performer: ' + topCrew.name + (dashPeriod === 'achievement' ? ` (${Math.round(topVal)}% achievement)` : ' (' + fmtRpText(topVal) + ')'))
  } else {
    lines.push('🏆 Top Performer: Belum ada data')
  }

  lines.push('')

  if (dashboard.topCrews.length > 0 && dashPeriod !== 'achievement') {
    lines.push('📌 Top 3 Leaderboard:')
    for (let i = 0; i < Math.min(3, dashboard.topCrews.length); i++) {
      const crew = dashboard.topCrews[i]
      const val =
        dashPeriod === 'today' ? crew.todayTotal : dashPeriod === 'week' ? crew.weekTotal : crew.monthTotal
      const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'
      lines.push(rankLabel + ' ' + (i + 1) + '. ' + crew.name + ' - ' + fmtRpText(val))
    }
  } else if (dashPeriod === 'achievement') {
    const sorted = [...dashboard.crewStats].sort((a, b) => b.crewMonthlyAchievement - a.crewMonthlyAchievement)
    lines.push('📌 Top 3 Achievement:')
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      const crew = sorted[i]
      const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'
      lines.push(rankLabel + ' ' + (i + 1) + '. ' + crew.name + ' - ' + Math.round(crew.crewMonthlyAchievement) + '% (' + fmtRpText(crew.monthTotal) + ')')
    }
  } else {
    lines.push('📌 Top 3 Leaderboard: Belum ada data')
  }

  if (dashboard.groupAchievements.length > 0) {
    lines.push('')
    lines.push('🏢 Group Achievement:')
    for (const group of dashboard.groupAchievements) {
      const pct = Math.round(group.monthlyAchievement)
      lines.push('  • ' + group.name + ': ' + pct + '% dari target ' + fmtRpText(group.monthlyTarget))
    }
  }

  return lines.join('\n')
}

const DashboardExport = React.memo(function DashboardExport({ dashboard, dashPeriod }: DashboardExportProps) {
  const handleCopySummary = useCallback(async () => {
    const text = buildSummaryText(dashboard, dashPeriod)
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Ringkasan berhasil disalin!', {
        description: 'Tempel ke pesan atau dokumen.',
        icon: <ClipboardCheck className="w-4 h-4 text-[#E14227]" />,
      })
    } catch {
      toast.error('Gagal menyalin ringkasan', {
        description: 'Pastikan browser memiliki akses clipboard.',
      })
    }
  }, [dashboard, dashPeriod])

  const handleDownloadImage = useCallback(() => {
    toast.info('Fitur akan segera hadir', {
      description: 'Unduh dashboard sebagai gambar sedang dalam pengembangan.',
    })
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-[#F0D5C5] dark:hover:bg-[#3A0D0A]/30 hover:text-[#B8321E] dark:hover:text-[#F07050]"
          title="Ekspor Dashboard"
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Ekspor Dashboard
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopySummary} className="cursor-pointer gap-2.5">
          <Copy className="w-4 h-4 text-[#E14227]" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Salin Ringkasan</span>
            <span className="text-[10px] text-muted-foreground">Salin teks ringkasan ke clipboard</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDownloadImage} className="cursor-pointer gap-2.5">
          <ImageIcon className="w-4 h-4 text-amber-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Unduh Gambar</span>
            <span className="text-[10px] text-muted-foreground">Simpan dashboard sebagai gambar</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

export { DashboardExport, buildSummaryText }
export default DashboardExport
