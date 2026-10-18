import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { paymentModeLabels, paymentModeOptions } from '@/features/purchase/api/purchase.api'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { ApiError } from '@/lib/api'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { financeApi, moveKindLabels } from '../api/finance.api'
import type { MoveKind, Movement, PaymentMode } from '../types'
import { useListOrder } from '@/lib/useListOrder'

const isTransfer = (k: MoveKind) => k === 'DEPOSIT' || k === 'WITHDRAW'

function MovementModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({ kind: 'DEPOSIT' as MoveKind, amount: '', mode: 'BANK' as PaymentMode, docDate: todayISO(), reference: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (!(Number(f.amount) > 0)) return toast.error('Enter the amount')
    setBusy(true)
    try {
      const m = await financeApi.addMovement({ ...f, amount: Number(f.amount), reference: f.reference.trim() || undefined, notes: f.notes.trim() || undefined })
      toast.success(`${m.docNo} saved`)
      onSaved()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Money in / out" description="Money that is not a sale, purchase or expense." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="What happened" value={f.kind} onChange={(e) => { const kind = e.target.value as MoveKind; setF((x) => ({ ...x, kind, mode: isTransfer(kind) ? 'BANK' : 'CASH' })) }} options={Object.entries(moveKindLabels).map(([value, label]) => ({ value, label }))} className="sm:col-span-2" />
        <Input label="Amount ₹" type="number" inputMode="decimal" min={0} value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} autoFocus />
        <Select
          label={isTransfer(f.kind) ? 'Bank side' : 'Cash or bank'}
          value={f.mode}
          onChange={(e) => setF((x) => ({ ...x, mode: e.target.value as PaymentMode }))}
          options={paymentModeOptions.filter((o) => !isTransfer(f.kind) || o.value !== 'CASH')}
        />
        <Input label="Date" type="date" max={todayISO()} value={f.docDate} onChange={(e) => setF((x) => ({ ...x, docDate: e.target.value }))} />
        <Input label="Reference" value={f.reference} onChange={(e) => setF((x) => ({ ...x, reference: e.target.value }))} placeholder="Deposit slip / UPI ref" />
        <Input label="Note" value={f.notes} onChange={(e) => setF((x) => ({ ...x, notes: e.target.value }))} className="sm:col-span-2" />
      </div>
    </Modal>
  )
}

// Cash & day book → "Money in / out": cash ↔ bank, owner in / out, other income.
export function MovementsView() {
  const [range, setRange] = useState<DateRangeValue>(() => ({ from: `${todayISO().slice(0, 8)}01`, to: todayISO() }))
  const [order, setOrder] = useListOrder('moves')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [cancelling, setCancelling] = useState<Movement | null>(null)
  const filters = { order, status: 'all', from: range.from || undefined, to: range.to || undefined }
  const q = useApiQuery(['movements', filters, page], () => financeApi.movements({ ...filters, page }))
  const columns: Column<Movement>[] = [
    { key: 'what', header: 'What', mobile: 'title', render: (m) => <span className="font-medium text-ink">{moveKindLabels[m.kind]}</span> },
    { key: 'date', header: 'Date', mobile: 'subtitle', render: (m) => `${formatDate(m.docDate)} · ${m.docNo}` },
    { key: 'mode', header: 'Mode', render: (m) => `${paymentModeLabels[m.mode]}${m.reference ? ` · ${m.reference}` : ''}` },
    { key: 'amount', header: 'Amount', align: 'right', mobile: 'badge', render: (m) => (m.status === 'CANCELLED' ? <Badge>Cancelled</Badge> : <span className="font-semibold">{formatINR(Number(m.amount))}</span>) },
    { key: 'x', header: '', align: 'right', mobile: 'hidden', render: (m) => (m.status === 'POSTED' ? <button type="button" onClick={() => setCancelling(m)} className="text-sm text-muted hover:text-danger">Cancel</button> : null) },
  ]
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} order={order} onOrder={(o) => { setOrder(o); setPage(1) }} />
        <div className="flex gap-2">
          <ExportButton path="/money-movements/export" params={filters} />
          <Button variant="primary" icon={IconPlus} onClick={() => setAdding(true)}>Add entry</Button>
        </div>
      </div>
      <Card bodyClassName="p-0">
        <DataTable startIndex={(page - 1) * 20 + 1} columns={columns} rows={q.data?.items ?? []} rowKey={(m) => m.id} loading={q.loading} emptyTitle="No entries" emptyDescription="Cash deposited to the bank, owner taking money, other income …" />
        {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
      </Card>
      {adding && <MovementModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); q.reload() }} />}
      {cancelling && <CancelDocModal docNo={cancelling.docNo} effect="Cash / bank balances go back." onCancel={(r) => financeApi.cancelMovement(cancelling.id, r)} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); q.reload() }} />}
    </>
  )
}
