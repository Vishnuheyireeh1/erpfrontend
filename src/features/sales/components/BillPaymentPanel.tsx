import { Input, Textarea } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { formatINR } from '@/lib/format'
import { splitTenders } from '../calc'
import { tenderInput, type TenderRow } from '../tenders'
import type { Customer } from '../types'
import { TenderInputs } from './TenderInputs'

// customerMode: "Customer" chosen — walkInName / walkInPhone are then the customer's name + phone (saved with the bill).
export type BillMeta = { walkInName: string; walkInPhone: string; billDiscount: string; notes: string; docDate: string; bookNo?: string; customerMode?: boolean }

type Props = {
  customer: Customer | null
  meta: BillMeta
  onMeta: (patch: Partial<BillMeta>) => void
  tenders: TenderRow[]
  onTenders: (rows: TenderRow[]) => void
  grandTotal: number
  maxDate: string
  advanceAvailable: number // customer's unused advance + return credit
  useAdvance: boolean
  onUseAdvance: (v: boolean) => void
  // Stitching on this bill: the items total (shown for the quick-advance buttons); anything unpaid is the job balance.
  jobItemsTotal?: number | null
}

// Right-hand side of the billing screen: advance, bill discount and the money handed over (customer is in BillCustomerBar).
export function BillPaymentPanel({ customer, meta, onMeta, tenders, onTenders, grandTotal, maxDate, advanceAvailable, useAdvance, onUseAdvance, jobItemsTotal = null }: Props) {
  const isJob = jobItemsTotal !== null
  const advanceUsed = customer && useAdvance ? Math.min(advanceAvailable, grandTotal) : 0
  const toPay = Math.round((grandTotal - advanceUsed) * 100) / 100
  const pay = splitTenders(tenderInput(tenders), toPay)
  const remaining = Math.max(0, Math.round((toPay - pay.paid) * 100) / 100)

  // "Paid in full": put the remaining amount on the last empty row, or a new cash row.
  const fillRest = () => {
    if (remaining <= 0) return
    const empty = tenders.find((t) => !(Number(t.amount) > 0))
    if (empty) onTenders(tenders.map((t) => (t === empty ? { ...t, amount: String(remaining) } : t)))
    else onTenders([...tenders, { key: `fill${Date.now()}`, mode: 'CASH', amount: String(remaining), reference: '' }])
  }

  // Stitching job: one-tap advance amounts.
  const quick: [string, number][] = isJob && toPay > 0
    ? ([['₹500', 500], ['₹1,000', 1000], [`Half ${formatINR(Math.ceil(toPay / 2))}`, Math.ceil(toPay / 2)], [`Full ${formatINR(toPay)}`, toPay]] as [string, number][]).filter(([, a], i) => a < toPay || i === 3)
    : []
  const payExactly = (amount: number) => onTenders(tenders.map((t, i) => ({ ...t, amount: i === 0 ? String(amount) : '' })))

  return (
    <div className="flex flex-col gap-4">
      {customer && advanceAvailable > 0.004 && (
        <Switch
          label={`Use advance / credit ₹${advanceAvailable.toLocaleString('en-IN')}`}
          hint={useAdvance ? `₹${advanceUsed.toLocaleString('en-IN')} of it goes on this bill` : 'Money the customer paid earlier or credit from a return'}
          checked={useAdvance}
          onChange={onUseAdvance}
        />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Input label={isJob ? 'Discount on stitching ₹' : 'Bill discount ₹'} data-hotkey="discount" type="number" inputMode="decimal" min={0} value={meta.billDiscount} onChange={(e) => onMeta({ billDiscount: e.target.value })} />
        <Input label="Bill date" type="date" max={maxDate} value={meta.docDate} onChange={(e) => onMeta({ docDate: e.target.value })} />
        {isJob && <Input label="SJ number" required value={meta.bookNo ?? ''} onChange={(e) => onMeta({ bookNo: e.target.value })} maxLength={30} placeholder="From the paper book" />}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink">{isJob ? 'Advance paid now' : 'Money received'}</p>
          {!isJob && remaining > 0 && grandTotal > 0 && (
            <button type="button" onClick={fillRest} className="text-sm font-medium text-brand hover:underline">
              Paid in full {formatINR(remaining)}
            </button>
          )}
        </div>
        {quick.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {quick.map(([label, amount]) => (
              <button key={label} type="button" aria-pressed={pay.paid === amount} onClick={() => payExactly(amount)} className={pay.paid === amount ? 'h-9 rounded-control border border-brand bg-brand px-3 text-sm font-medium text-white' : 'h-9 rounded-control border border-line bg-card px-3 text-sm font-medium text-ink-soft hover:border-brand'}>
                {label}
              </button>
            ))}
          </div>
        )}
        <TenderInputs rows={tenders} onChange={onTenders} />
      </div>

      {grandTotal > 0 && (
        <div className="flex flex-col gap-1 rounded-card bg-page px-3 py-2 text-sm">
          {advanceUsed > 0 && <div className="flex justify-between"><span className="text-muted">From advance / credit</span><span>{formatINR(advanceUsed)}</span></div>}
          <div className="flex justify-between"><span className="text-muted">{isJob ? 'Paid now' : 'Received'}</span><span>{formatINR(pay.paid)}</span></div>
          {pay.change > 0 && <div className="flex justify-between text-base font-semibold text-success"><span>Give change</span><span>{formatINR(pay.change)}</span></div>}
          {pay.due > 0 && (
            <div className="flex justify-between font-medium text-warn">
              <span>{isJob ? 'Balance — collect at hand over' : 'Balance (credit)'}</span>
              <span>{formatINR(pay.due)}</span>
            </div>
          )}
          {!isJob && pay.due > 0 && (customer || meta.walkInName.trim() || meta.walkInPhone.trim()
            ? <p className="text-xs text-warn">On credit — {formatINR(pay.due)} goes on the customer's balance (collect later with Receive money).</p>
            : <p className="text-xs text-danger">A walk-in bill is paid in full. Add the customer's name and phone to give credit.</p>)}
        </div>
      )}

      <Textarea label="Notes" rows={2} value={meta.notes} onChange={(e) => onMeta({ notes: e.target.value })} placeholder="Optional — printed on the bill" />
    </div>
  )
}
