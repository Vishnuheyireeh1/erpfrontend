import { IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { tailorPaymentApi } from '../api/workshop.api'
import type { TailorPayment } from '../types'
import { useListOrder } from '@/lib/useListOrder'

// Tailors page → "Payments" tab: every payment made to tailors, with Excel and cancel.
export function TailorPaymentsList() {
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const [order, setOrder] = useListOrder('worker-payments')
  const [page, setPage] = useState(1)
  const [cancelling, setCancelling] = useState<TailorPayment | null>(null)
  const debounced = useDebounce(search.trim())
  const filters = { order, search: debounced || undefined, from: range.from || undefined, to: range.to || undefined, status: 'all' }
  const q = useApiQuery(['tailor-payments', filters, page], () => tailorPaymentApi.list({ ...filters, page }))

  const columns: Column<TailorPayment>[] = [
    { key: 'docNo', header: 'Payment', mobile: 'title', render: (p) => <span className="font-medium text-ink">{p.docNo}</span> },
    { key: 'tailor', header: 'Worker', mobile: 'subtitle', render: (p) => p.tailor.name },
    { key: 'date', header: 'Date', mobile: 'subtitle', render: (p) => formatDate(p.docDate) },
    { key: 'mode', header: 'Paid by', render: (p) => `${paymentModeLabels[p.mode]}${p.reference ? ` · ${p.reference}` : ''}` },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatINR(Number(p.amount)) },
    { key: 'status', header: 'Status', mobile: 'badge', render: (p) => <Badge tone={p.status === 'POSTED' ? 'success' : 'neutral'}>{p.status === 'POSTED' ? 'Paid' : 'Cancelled'}</Badge> },
    {
      key: 'cancel',
      header: '',
      align: 'right',
      mobile: 'hidden',
      render: (p) => (p.status === 'POSTED' ? <button type="button" onClick={() => setCancelling(p)} className="text-sm text-muted hover:text-danger">Cancel</button> : <span className="text-xs text-muted">{p.cancelReason}</span>),
    },
  ]

  return (
    <>
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input icon={IconSearch} aria-label="Search payments" placeholder="Payment no., worker or reference" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="md:w-96" />
        <div className="flex items-center justify-between gap-3">
          {q.data && <span className="text-sm text-muted">Paid {formatINR(q.data.totalPaid)}</span>}
          <ExportButton path="/tailor-payments/export" params={filters} />
        </div>
      </div>
      <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} order={order} onOrder={(o) => { setOrder(o); setPage(1) }} className="mb-4" />
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load payments" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <>
            <DataTable startIndex={(page - 1) * 20 + 1} columns={columns} rows={q.data?.items ?? []} rowKey={(p) => p.id} loading={q.loading} emptyTitle="No payments yet" emptyDescription="Pay a worker from their page (Job work → Workers)." />
            {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
      {cancelling && (
        <CancelDocModal
          docNo={cancelling.docNo}
          effect="The worker's balance goes back up."
          onCancel={(r) => tailorPaymentApi.cancel(cancelling.id, r)}
          onClose={() => setCancelling(null)}
          onDone={() => { setCancelling(null); q.reload() }}
        />
      )}
    </>
  )
}
