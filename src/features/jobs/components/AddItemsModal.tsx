import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { customerApi } from '@/features/sales/api/sales.api'
import { TenderInputs } from '@/features/sales/components/TenderInputs'
import { newTender, tenderInput, tenderTotal, type TenderRow } from '@/features/sales/tenders'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { jobsApi } from '../api/jobs.api'
import { productError, productsTotal, toProductInput, type ProductDraft } from '../jobDrafts'
import type { Job } from '../types'
import { ProductLinesEditor } from './ProductLinesEditor'

// usedOnly: "Use from stock" on the job costs — lines start as used for stitching (not billed).
type Props = { job: Job; usedOnly?: boolean; onClose: () => void; onDone: () => void }

// Items bought on a job (at booking or when collecting). Sold items are paid in full now; used fabric is not billed.
export function AddItemsModal({ job, usedOnly = false, onClose, onDone }: Props) {
  const toast = useToast()
  const advance = useApiQuery(['advance', job.customerId], () => customerApi.advance(job.customerId))
  const [rows, setRows] = useState<ProductDraft[]>([])
  const [tenders, setTenders] = useState<TenderRow[]>(() => [newTender()])
  const [useAdvance, setUseAdvance] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)
  const total = productsTotal(rows)
  const available = advance.data?.total ?? 0
  const fromAdvance = useAdvance ? Math.min(available, total) : 0
  const toPay = Math.max(0, Math.round((total - fromAdvance) * 100) / 100)
  const paying = tenderTotal(tenders)

  const save = async () => {
    setShowErrors(true)
    if (rows.length === 0) return toast.error('Scan or search the items')
    if (rows.some(productError)) return toast.error('Fix the highlighted items')
    if (paying + fromAdvance < total - 0.004) return toast.error(`Items ${formatINR(total)} must be paid in full now`)
    setBusy(true)
    try {
      await jobsApi.addItems(job.id, { lines: toProductInput(rows), tenders: tenderInput(tenders), useAdvance: useAdvance && available > 0 })
      toast.success(usedOnly ? 'Stock used for the job' : `Items added to ${job.docNo}`)
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={usedOnly ? `Use from stock — ${job.docNo}` : `Add items — ${job.docNo}`}
      description={usedOnly ? 'Fabric, lining, buttons… used for this stitching. Stock goes down; the cost counts in job costing.' : 'Readymade items or fabric. Items sold are paid in full now and printed on the job bill.'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>{usedOnly && total === 0 ? 'Use from stock' : `Save${total > 0 ? ` · ${formatINR(total)}` : ''}`}</Button></>}
    >
      <ProductLinesEditor rows={rows} onChange={setRows} showErrors={showErrors} defaultIncluded={usedOnly} />
      {total > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {available > 0.004 && <Switch label={`Use advance / credit ₹${available.toLocaleString('en-IN')}`} checked={useAdvance} onChange={setUseAdvance} />}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Pay now {formatINR(toPay)}</p>
              <button type="button" onClick={() => setTenders([newTender('CASH', String(toPay))])} className="text-sm font-medium text-brand hover:underline">Full {formatINR(toPay)}</button>
            </div>
            <TenderInputs rows={tenders} onChange={setTenders} />
          </div>
          {paying > toPay + 0.004 && <p className="text-sm text-muted">{formatINR(paying - toPay)} extra goes to the stitching balance.</p>}
        </div>
      )}
    </Modal>
  )
}
