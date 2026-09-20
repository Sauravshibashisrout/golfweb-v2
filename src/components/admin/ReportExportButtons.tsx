'use client'

import { Download } from 'lucide-react'

type Props = {
  subscribersData: Array<{
    displayName: string
    userId: string
    planName: string
    status: string
    renewalDate: string
  }>
  charityData: Array<{
    charityName: string
    month: string
    amountINR: number
    type: string
  }>
  payoutsData: Array<{
    winnerName: string
    drawTitle: string
    matchCount: number
    prizeINR: number
    status: string
    payoutRef: string
    paidAt: string
  }>
  drawsData: Array<{
    title: string
    cycleMonth: string
    status: string
    poolINR: number
    drawnNumbers: string
    rolloverOutINR: number
  }>
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCsv = (str: string | number) => {
    const val = String(str ?? '')
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n')

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function ReportExportButtons({
  subscribersData,
  charityData,
  payoutsData,
  drawsData,
}: Props) {
  function exportSubscribers() {
    downloadCSV(
      `golfgives_subscribers_${Date.now()}.csv`,
      ['Display Name', 'User ID', 'Plan', 'Status', 'Renewal Date'],
      subscribersData.map((s) => [s.displayName, s.userId, s.planName, s.status, s.renewalDate])
    )
  }

  function exportCharity() {
    downloadCSV(
      `golfgives_charity_contributions_${Date.now()}.csv`,
      ['Charity Name', 'Recognition Month', 'Amount (INR)', 'Allocation Type'],
      charityData.map((c) => [c.charityName, c.month, c.amountINR, c.type])
    )
  }

  function exportPayouts() {
    downloadCSV(
      `golfgives_payouts_${Date.now()}.csv`,
      ['Winner Name', 'Draw', 'Match Count', 'Prize (INR)', 'Status', 'Payout Reference', 'Paid At'],
      payoutsData.map((p) => [
        p.winnerName,
        p.drawTitle,
        p.matchCount,
        p.prizeINR,
        p.status,
        p.payoutRef,
        p.paidAt,
      ])
    )
  }

  function exportDraws() {
    downloadCSV(
      `golfgives_draws_${Date.now()}.csv`,
      ['Title', 'Cycle Month', 'Status', 'Pool (INR)', 'Drawn Numbers', 'Rollover Out (INR)'],
      drawsData.map((d) => [
        d.title,
        d.cycleMonth,
        d.status,
        d.poolINR,
        d.drawnNumbers,
        d.rolloverOutINR,
      ])
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={exportSubscribers}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
      >
        <Download size={13} /> Export Subscribers CSV
      </button>

      <button
        onClick={exportCharity}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
      >
        <Download size={13} /> Export Charity Giving CSV
      </button>

      <button
        onClick={exportPayouts}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
      >
        <Download size={13} /> Export Payouts CSV
      </button>

      <button
        onClick={exportDraws}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
      >
        <Download size={13} /> Export Draws CSV
      </button>
    </div>
  )
}
