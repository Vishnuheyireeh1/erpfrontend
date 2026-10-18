import { IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { monthLabel, salaryApi } from '../api/staff.api'
import type { SalaryPayment } from '../types'
import { SortSwitch } from '@/components/ui/DateRange'
import { useListOrder } from '@/lib/useListOrder'

// Staff page → "Salary paid" tab: every salary payment, by month, with Excel and cancel.
export function SalaryList({ version }: { version: number }) {
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const [page, setPage] = useState(1)
  const [cancelling, setCancelling] = useState<SalaryPayment | null>(null)
  const debounced = useDebounce(search.trim())
  const [order, setOrder] = useListOrder('salary-paid')
  const filters = { order, search: debounced || undefined, month: month || undefined, status: 'all' }
  const q = useApiQuery(['salary-payments', filters, page, version], () => salaryApi.list({ ...filters, page }))

  const columns: Column<SalaryPayment>[] = [
    { key: 'docNo', header: 'Payment', mobile: 'title', render: (p) => <span className="font-medium text-ink">{p.docNo}</span> },
    {
      key: 'staff',
      header: 'Staff',
      mobile: 'subtitle',
      render: (p) => <span className="block min-w-0"><span className="block truncate">{p.staff.name}</span><span className="block text-xs text-muted">{p.staff.role}</span></span>,
    },
    { key: 'month', header: 'Salary for', mobile: 'subtitle', render: (p) => monthLabel(p.month) },
    { key: 'date', header: 'Paid on', render: (p) => formatDate(p.docDate) },
    { key: 'mode', header: 'Paid by', mobile: 'hidden', render: (p) => `${paymentModeLabels[p.mode]}${p.reference ? ` · ${p.reference}` : ''}${p.notes ? ` · ${p.notes}` : ''}` },
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
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem] md:w-[36rem]">
          <Input icon={IconSearch} aria-label="Search salary payments" placeholder="Payment no., name or note" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          <Input type="month" aria-label="Salary month" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1) }} />
          <SortSwitch order={order} onOrder={(o) => { setOrder(o); setPage(1) }} />
        </div>
        <div className="flex items-center justify-between gap-3">
          {q.data && <span className="text-sm text-muted">{month ? `${monthLabel(month)}: ` : 'Total '}paid <b className="text-ink">{formatINR(q.data.totalPaid)}</b></span>}
          <ExportButton path="/salary-payments/export" params={filters} />
        </div>
      </div>
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load salary payments" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <>
            <DataTable startIndex={(page - 1) * 20 + 1} columns={columns} rows={q.data?.items ?? []} rowKey={(p) => p.id} loading={q.loading} emptyTitle="No salary paid yet" emptyDescription="Use 'Pay salary' to record what was paid." />
            {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
      {cancelling && (
        <CancelDocModal
          docNo={cancelling.docNo}
          effect="The money goes back to cash / bank and comes off the expenses."
          onCancel={(r) => salaryApi.cancel(cancelling.id, r)}
          onClose={() => setCancelling(null)}
          onDone={() => { setCancelling(null); q.reload() }}
        />
      )}
    </>
  )
}
