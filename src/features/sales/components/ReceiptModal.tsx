import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/controlClass'
import { Spinner } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { spreadPayment } from '@/lib/spreadPayment'
import { useApiQuery } from '@/lib/useApiQuery'
import { customerApi, salesApi } from '../api/sales.api'
import { newTender, tenderInput, tenderTotal, type TenderRow } from '../tenders'
import { TenderInputs } from './TenderInputs'

// target = the bill / job this money is for (pre-filled with its balance).
type Props = { customerId: number; customerName: string; target?: { kind: 'INV' | 'JOB'; id: number }; onClose: () => void; onSaved: () => void }
const keyOf = (d: { kind: 'INV' | 'JOB'; id: number }) => `${d.kind}:${d.id}`

const r2 = (n: number) => Math.round(n * 100) / 100

// Money received from a customer: balance on delivery, part payment or an advance.
// Auto = oldest unpaid bills first; or type an amount per bill. Extra = advance.
export function ReceiptModal({ customerId, customerName, target, onClose, onSaved }: Props) {
  const toast = useToast()
  const bills = useApiQuery(['unpaid-sales', customerId], () => customerApi.unpaidBills(customerId))
  const [tenders, setTenders] = useState<TenderRow[]>(() => [newTender()])
  const [docDate, setDocDate] = useState(todayISO)
  const [notes, setNotes] = useState('')
  const [manual, setManual] = useState(Boolean(target))
  const [perBill, setPerBill] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const list = useMemo(() => bills.data ?? [], [bills.data])
  // Receiving for one specific bill → pre-fill its balance once the bills arrive.
  const [prefilled, setPrefilled] = useState(false)
  if (!prefilled && bills.data) {
    setPrefilled(true)
    const doc = target ? list.find((b) => keyOf(b) === keyOf(target)) : undefined
    if (doc) {
      setTenders([newTender('CASH', String(doc.dueAmount))])
      setPerBill({ [keyOf(doc)]: String(doc.dueAmount) })
    }
  }

  const total = r2(tenderTotal(tenders))
  // Per-bill boxes follow the money received: this bill first, then the oldest (part payment leaves the rest due).
  const spread = (t: number) => spreadPayment(list, keyOf, (b) => b.dueAmount, t, target ? keyOf(target) : undefined)
  const allocated = manual ? r2(Object.values(perBill).reduce((s, v) => s + (Number(v) || 0), 0)) : Math.min(total, r2(list.reduce((s, b) => s + b.dueAmount, 0)))
  const advance = r2(total - allocated)

  const save = async () => {
    if (total <= 0) return setError('Enter the amount received')
    if (manual && allocated > total + 0.004) return setError('Amounts against bills are more than the money received')
    setSaving(true)
    try {
      const allocations = manual
        ? Object.entries(perBill).filter(([, v]) => Number(v) > 0).map(([k, v]) => {
            const [kind, id] = k.split(':')
            return kind === 'JOB' ? { jobId: Number(id), amount: Number(v) } : { invoiceId: Number(id), amount: Number(v) }
          })
        : undefined
      const r = await salesApi.receive({ customerId, docDate, tenders: tenderInput(tenders), notes: notes.trim() || undefined, allocations })
      toast.success(`${r.docNo} saved — ${formatINR(total)} received`)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Receive from ${customerName}`}
      description="Balance at hand over, part payment or an advance (bills and stitching jobs)."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save {total > 0 ? formatINR(total) : ''}</Button></>}
    >
      <TenderInputs rows={tenders} onChange={(t) => { setTenders(t); setError(''); if (manual) setPerBill(spread(r2(tenderTotal(t)))) }} />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Advance for wedding order" />
      </div>
      <div className="mt-5">
        <Switch label="Choose bills myself" hint="Off: the oldest unpaid bills are cleared first." checked={manual} onChange={(v) => { setManual(v); if (v) setPerBill(spread(total)) }} />
      </div>
      <div className="mt-3 rounded-card border border-line">
        {bills.loading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : list.length === 0 ? (
          <p className="p-4 text-sm text-muted">No unpaid bills — the whole amount is kept as an advance.</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((b) => (
              <li key={keyOf(b)} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{b.docNo}{b.kind === 'JOB' ? ' · stitching job' : ''}</p>
                  <p className="text-xs text-muted">{formatDate(b.docDate)} · due {formatINR(b.dueAmount)}</p>
                </div>
                {manual && (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={b.dueAmount}
                    aria-label={`Against ${b.docNo}`}
                    value={perBill[keyOf(b)] ?? ''}
                    placeholder="0"
                    onChange={(e) => setPerBill((p) => ({ ...p, [keyOf(b)]: e.target.value }))}
                    className={cn(controlClass(), 'h-9 w-28! shrink-0 text-right')}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <span className="text-muted">Against bills {formatINR(allocated)}</span>
        <span className={advance > 0 ? 'font-medium text-success' : 'text-muted'}>Advance {formatINR(Math.max(0, advance))}</span>
      </div>
      {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
