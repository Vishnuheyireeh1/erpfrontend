import { useState } from 'react'
import type { Column } from '@/components/ui/DataTable'
import type { DateRangeValue } from '@/components/ui/DateRange'
import { todayISO } from '@/features/inventory/constants'
import { formatINR2 as formatINR } from '@/lib/format'
import type { Tax } from './types'

// Date range for a report — this month by default; empty ends fall back to month start / today.
export function useReportRange() {
  const [range, setRange] = useState<DateRangeValue>(() => ({ from: `${todayISO().slice(0, 8)}01`, to: todayISO() }))
  const from = range.from || `${todayISO().slice(0, 8)}01`
  const to = range.to || todayISO()
  return { range, setRange, from, to }
}

// Taxable + CGST + SGST + IGST columns (IGST hidden on phones — rarely used by a Kerala shop).
export function taxColumns<T extends Tax>(): Column<T>[] {
  return [
    { key: 'taxable', header: 'Taxable', align: 'right', render: (r) => formatINR(r.taxable) },
    { key: 'cgst', header: 'CGST', align: 'right', render: (r) => formatINR(r.cgst) },
    { key: 'sgst', header: 'SGST', align: 'right', render: (r) => formatINR(r.sgst) },
    { key: 'igst', header: 'IGST', align: 'right', mobile: 'hidden', render: (r) => (r.igst ? formatINR(r.igst) : '—') },
  ]
}

export const rateLabel = (rate: number) => (rate === 0 ? 'No GST (0%)' : `GST ${rate}%`)
