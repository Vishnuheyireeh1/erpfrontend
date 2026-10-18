import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { formatDate, formatINR2 } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { money, useYearRange } from '../accountsUtils'
import { accountsApi } from '../api/accounts.api'
import type { Journal } from '../types'
import { JournalFormModal } from './JournalFormModal'
import { useListOrder } from '@/lib/useListOrder'

const columns: Column<Journal>[] = [
  { key: 'docNo', header: 'Entry', mobile: 'title', render: (j) => <span className="font-medium text-brand">{j.docNo}</span> },
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (j) => formatDate(j.docDate) },
  { key: 'narration', header: 'What for', render: (j) => <span className="text-ink-soft">{j.narration}</span> },
  { key: 'total', header: 'Amount', align: 'right', render: (j) => formatINR2(Number(j.total)) },
  { key: 'status', header: 'Status', mobile: 'badge', render: (j) => (j.status === 'POSTED' ? <Badge tone="success">Posted</Badge> : <Badge tone="danger">Cancelled</Badge>) },
]

function JournalModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const q = useApiQuery(['journal', id], () => accountsApi.journal(id))
  const [cancelling, setCancelling] = useState(false)
  const j = q.data
  if (cancelling && j) return <CancelDocModal docNo={j.docNo} effect="Its debits and credits are taken out of the books." onCancel={(r) => accountsApi.cancelJournal(id, r)} onClose={() => setCancelling(false)} onDone={() => { onChanged(); onClose() }} />
  return (
    <Modal open onClose={onClose} size="lg" title={j ? j.docNo : 'Journal entry'} description={j ? `${formatDate(j.docDate)} · ${j.narration} · by ${j.createdBy}` : undefined}
      footer={<>{j?.status === 'POSTED' && <Button variant="danger" onClick={() => setCancelling(true)}>Cancel entry</Button>}<Button onClick={onClose}>Close</Button></>}>
      {j?.status === 'CANCELLED' && <p className="mb-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">Cancelled{j.cancelledBy ? ` by ${j.cancelledBy}` : ''} — {j.cancelReason}</p>}
      <div className="flex flex-col divide-y divide-line rounded-card border border-line text-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] gap-2 bg-page px-3 py-2 text-xs font-medium text-muted"><span>Account</span><span className="text-right">Debit</span><span className="text-right">Credit</span></div>
        {(j?.lines ?? []).map((l) => (
          <div key={l.id} className="grid grid-cols-[minmax(0,1fr)_7rem_7rem] gap-2 px-3 py-2">
            <span className="min-w-0"><span className="block truncate text-ink">{l.accountName}</span>{l.note && <span className="block text-xs text-muted">{l.note}</span>}</span>
            <span className="text-right">{money(Number(l.debit))}</span>
            <span className="text-right">{money(Number(l.credit))}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// Accounts → Journal entries: the owner's / CA's own entries (everything else is automatic).
export function JournalsView() {
  const { range, setRange, from, to } = useYearRange()
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const chart = useApiQuery('accounts-chart', () => accountsApi.chart())
  const [order, setOrder] = useListOrder('journals')
  const q = useApiQuery(['journals', from, to, page, order], () => accountsApi.journals({ from, to, page, order }))
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} order={order} onOrder={(o) => { setOrder(o); setPage(1) }} />
        <div className="flex gap-2">
          <ExportButton path="/accounts/journals/export" params={{ from, to, order }} />
          <Button variant="primary" icon={IconPlus} onClick={() => setAdding(true)} disabled={!chart.data}>New entry</Button>
        </div>
      </div>
      <Card bodyClassName="p-0">
        <DataTable startIndex={(page - 1) * 20 + 1} columns={columns} rows={q.data?.items ?? []} rowKey={(j) => j.id} loading={q.loading} onRowClick={(j) => setOpen(j.id)}
          emptyTitle="No journal entries" emptyDescription="Bills, jobs, purchases, payments, salary and expenses go into the books by themselves. Use a journal only for things like capital, machines, loans, depreciation or GST paid." />
        {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
      </Card>
      {adding && chart.data && <JournalFormModal accounts={chart.data.items} locked={chart.data.locked} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); q.reload() }} />}
      {open && <JournalModal id={open} onClose={() => setOpen(null)} onChanged={q.reload} />}
    </>
  )
}
