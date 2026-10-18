import { IconPlus, IconX } from '@tabler/icons-react'
import { controlClass } from '@/components/ui/controlClass'
import { paymentModeOptions } from '@/features/purchase/api/purchase.api'
import { cn } from '@/lib/cn'
import { newTender, type TenderRow } from '../tenders'
import type { PaymentMode } from '../types'

type Props = { rows: TenderRow[]; onChange: (rows: TenderRow[]) => void; max?: number }

// Money handed over: one or more lines (e.g. ₹1,000 UPI + ₹500 cash).
export function TenderInputs({ rows, onChange, max = 5 }: Props) {
  const set = (key: string, patch: Partial<TenderRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const box = cn(controlClass(), 'h-10')

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={r.key} className="grid grid-cols-[92px_minmax(0,1fr)_minmax(0,1fr)_32px] gap-2">
          <select aria-label={`Payment ${i + 1} mode`} value={r.mode} onChange={(e) => set(r.key, { mode: e.target.value as PaymentMode })} className={box}>
            {paymentModeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            aria-label={`Payment ${i + 1} amount`}
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="₹"
            value={r.amount}
            onChange={(e) => set(r.key, { amount: e.target.value })}
            className={cn(box, 'text-right')}
          />
          <input
            aria-label={`Payment ${i + 1} reference`}
            placeholder={r.mode === 'CASH' ? 'Note' : 'Ref no.'}
            value={r.reference}
            onChange={(e) => set(r.key, { reference: e.target.value })}
            className={box}
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((x) => x.key !== r.key))}
            aria-label={`Remove payment ${i + 1}`}
            className="flex h-10 items-center justify-center rounded-control text-muted hover:bg-page hover:text-ink"
          >
            <IconX size={16} />
          </button>
        </div>
      ))}
      {rows.length < max && (
        <button type="button" onClick={() => onChange([...rows, newTender(rows.some((r) => r.mode === 'CASH') ? 'UPI' : 'CASH')])} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-brand hover:underline">
          <IconPlus size={15} /> {rows.length ? 'Split payment' : 'Add payment'}
        </button>
      )}
    </div>
  )
}
