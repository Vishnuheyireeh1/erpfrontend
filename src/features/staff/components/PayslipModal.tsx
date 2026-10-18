import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { paymentModeOptions } from '@/features/purchase/api/purchase.api'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { monthLabel, payrollApi } from '../api/staff.api'
import type { PayrollRow } from '../types'

type Props = { row: PayrollRow; month: string; onClose: () => void; onPaid: () => void }

const Line = ({ label, value, minus, strong }: { label: string; value: number; minus?: boolean; strong?: boolean }) => (
  <div className={cn('flex justify-between gap-3 py-1 text-sm', strong ? 'font-semibold text-ink' : 'text-ink-soft')}>
    <span>{label}</span>
    <span className={minus ? 'text-danger' : undefined}>{minus ? '− ' : ''}{formatINR(value)}</span>
  </div>
)

// Monthly salary → Pay: salary − advance already paid + bonus − deduction, plus the per-piece work due → one payslip.
export function PayslipModal({ row, month, onClose, onPaid }: Props) {
  const toast = useToast()
  const [bonus, setBonus] = useState('')
  const [deduction, setDeduction] = useState('')
  const [deductionNote, setDeductionNote] = useState('')
  const [piece, setPiece] = useState(() => String(Math.max(0, row.pieceDue)))
  const [mode, setMode] = useState('CASH')
  const [docDate, setDocDate] = useState(todayISO)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const b = Number(bonus) || 0
  const d = Number(deduction) || 0
  const p = row.isPiece ? Number(piece) || 0 : 0
  const salaryPart = row.salary - row.advance + b - d
  const total = Math.round((salaryPart + p) * 100) / 100
  const s = row.staff

  const save = async () => {
    if (d > 0 && !deductionNote.trim()) return setError('Write why the deduction (e.g. 2 days leave)')
    if (salaryPart < 0) return setError('Advance + deduction is more than the salary')
    if (p > Math.max(0, row.pieceDue) + 0.004) return setError(`Per-piece pay due is only ${formatINR(Math.max(0, row.pieceDue))}`)
    setSaving(true)
    try {
      const slip = await payrollApi.pay({
        staffId: s.id, month, docDate, bonus: b, deduction: d, deductionNote: deductionNote.trim() || undefined, piecePaid: p, mode,
        reference: reference.trim() || undefined, notes: notes.trim() || undefined,
      })
      toast.success(`${slip.docNo} — ${formatINR(total)} paid to ${s.name}. Tap Payslip to print.`)
      onPaid()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not pay')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Pay salary — ${s.name}`}
      description={`${s.role} · ${monthLabel(month)}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Pay {formatINR(Math.max(0, total))} & make payslip</Button></>}
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-card border border-line p-3">
          {row.salary > 0 && <Line label="Monthly salary" value={row.salary} />}
          {row.advance > 0 && <Line label="Advance already paid" value={row.advance} minus />}
          {b > 0 && <Line label="Bonus / extra" value={b} />}
          {d > 0 && <Line label={`Deduction${deductionNote ? ` (${deductionNote})` : ''}`} value={d} minus />}
          {row.isPiece && (
            <>
              <Line label={`Per-piece work this month${row.piecePieces ? ` (${row.piecePieces} pcs stitched)` : ''}`} value={row.pieceEarned} />
              {row.pieceBefore !== 0 && <Line label={row.pieceBefore > 0 ? 'Earlier per-piece balance' : 'Per-piece advance taken'} value={Math.abs(row.pieceBefore)} minus={row.pieceBefore < 0} />}
              {p < Math.max(0, row.pieceDue) && <Line label="Per-piece kept for later" value={Math.max(0, row.pieceDue) - p} minus />}
            </>
          )}
          <div className="mt-2 border-t border-line pt-2"><Line label="To pay now" value={Math.max(0, total)} strong /></div>
          {row.work.length > 0 && (
            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer text-brand">Work done this month ({row.work.length} jobs)</summary>
              <ul className="mt-1 flex flex-col gap-1">
                {row.work.map((w) => <li key={w.docNo} className="flex justify-between gap-2"><span>{w.docNo} · {w.detail}</span><span>{formatINR(w.amount)}</span></li>)}
              </ul>
            </details>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Bonus ₹" type="number" inputMode="decimal" min={0} value={bonus} onChange={(e) => { setBonus(e.target.value); setError('') }} placeholder="0" />
          <Input label="Deduction ₹" type="number" inputMode="decimal" min={0} value={deduction} onChange={(e) => { setDeduction(e.target.value); setError('') }} placeholder="0" />
          {d > 0 && <Input label="Why deducted" required value={deductionNote} onChange={(e) => { setDeductionNote(e.target.value); setError('') }} placeholder="2 days leave" className="col-span-2" />}
          {row.isPiece && <Input label="Per-piece pay now ₹" type="number" inputMode="decimal" min={0} value={piece} onChange={(e) => { setPiece(e.target.value); setError('') }} hint={`Due ${formatINR(Math.max(0, row.pieceDue))}`} className="col-span-2" />}
          <Select label="Paid by" value={mode} onChange={(e) => setMode(e.target.value)} options={paymentModeOptions} />
          <Input label="Paid on" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
          <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref" />
          <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
