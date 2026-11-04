import { useState } from 'react'
import { controlClass } from '@/components/ui/controlClass'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { payrollApi } from '../api/staff.api'
import type { PayrollRow } from '../types'

type Props = { row: PayrollRow; month: string; onSaved: () => void }

// Monthly salary list: type the leave taken this month (paid per day: the days worked). Saved when the cursor leaves
// the box (Enter = next person).
export function LeaveBox({ row, month, onSaved }: Props) {
  const toast = useToast()
  const perDay = row.dayRate > 0
  const saved = perDay ? row.workedDays : row.leaveDays
  const [text, setText] = useState(saved ? String(saved) : '')

  const save = async () => {
    const days = Number(text) || 0
    if (days === saved) return
    try {
      await (perDay ? payrollApi.setWorkDays : payrollApi.setLeave)(row.staff.id, month, days)
      onSaved()
    } catch (err) {
      setText(saved ? String(saved) : '')
      toast.error(err instanceof ApiError ? err.message : perDay ? 'Could not save the days' : 'Could not save the leave')
    }
  }

  // A paid month is closed — its days are on the payslip.
  if (row.payslip) return <span className="text-ink-soft">{saved || '—'}</span>
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      max={31}
      step={0.5}
      aria-label={`${perDay ? 'Days worked' : 'Leave days'} of ${row.staff.name}`}
      value={text}
      placeholder="0"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={save}
      className={cn(controlClass(), 'h-9 w-20 text-right')}
    />
  )
}
