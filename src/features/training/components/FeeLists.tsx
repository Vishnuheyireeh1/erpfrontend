import { IconPrinter, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { trainingApi } from '../api/training.api'
import { usePrintFee } from '../print/usePrintFee'
import type { FeeReceiptFull, PendingFee } from '../types'
import { FeeModal } from './FeeModal'
import { useListOrder } from '@/lib/useListOrder'

// Training → "Fees pending": who still owes, biggest first, with "Receive".
export function FeesPendingList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [paying, setPaying] = useState<PendingFee | null>(null)
  const debounced = useDebounce(search.trim())
  const filters = { search: debounced || undefined }
  const q = useApiQuery(['fees-pending', filters], () => trainingApi.pending(filters))
  const columns: Column<PendingFee>[] = [
    { key: 'name', header: 'Student', mobile: 'title', render: (p) => <span className="block min-w-0"><span className="block font-medium text-ink">{p.name}</span><span className="block text-xs text-muted">{p.code}{p.phone ? ` · ${p.phone}` : ''}</span></span> },
    { key: 'course', header: 'Course', mobile: 'subtitle', render: (p) => `${p.course} · ${p.batch}` },
    { key: 'fee', header: 'Fee', align: 'right', mobile: 'hidden', render: (p) => formatINR(p.fee) },
    { key: 'paid', header: 'Paid', align: 'right', render: (p) => `${formatINR(p.paid)}${p.lastPaid ? ` · ${formatDate(p.lastPaid)}` : ''}` },
    { key: 'due', header: 'Due', align: 'right', mobile: 'badge', render: (p) => <span className="font-semibold text-warn">{formatINR(p.due)}</span> },
    { key: 'pay', header: '', align: 'right', render: (p) => <Button size="sm" onClick={(e) => { e.stopPropagation(); setPaying(p) }}>Receive</Button> },
  ]
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input icon={IconSearch} aria-label="Search fees pending" placeholder="Name, code or phone" value={search} onChange={(e) => setSearch(e.target.value)} className="md:w-96" />
        <div className="flex items-center justify-between gap-3">
          {q.data && <span className="text-sm text-muted">{q.data.count} students · due <b className="text-warn">{formatINR(q.data.total)}</b></span>}
          <ExportButton path="/training/fees/pending/export" params={filters} />
        </div>
      </div>
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : (
          <DataTable columns={columns} rows={q.data?.items ?? []} rowKey={(p) => p.enrolmentId} loading={q.loading} emptyTitle="No fees pending" emptyDescription="Everyone has paid in full." onRowClick={(p) => navigate(`/training/students/${p.studentId}`)} />
        )}
      </Card>
      {paying && <FeeModal enrolmentId={paying.enrolmentId} title={`${paying.name} · ${paying.course}`} due={paying.due} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); q.reload() }} />}
    </>
  )
}

// Training → "Fee receipts": every fee received, with print, cancel and Excel.
export function FeeReceiptsList() {
  const navigate = useNavigate()
  const printFee = usePrintFee()
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const [order, setOrder] = useListOrder('fees')
  const [page, setPage] = useState(1)
  const [cancelling, setCancelling] = useState<FeeReceiptFull | null>(null)
  const debounced = useDebounce(search.trim())
  const filters = { order, search: debounced || undefined, from: range.from || undefined, to: range.to || undefined }
  const q = useApiQuery(['fee-receipts', filters, page], () => trainingApi.receipts({ ...filters, page }))
  const columns: Column<FeeReceiptFull>[] = [
    { key: 'docNo', header: 'Receipt', mobile: 'title', render: (r) => <span className="font-medium text-ink">{r.docNo}</span> },
    { key: 'student', header: 'Student', mobile: 'subtitle', render: (r) => `${r.enrolment.student.name} · ${r.enrolment.batch.course.name}` },
    { key: 'date', header: 'Date', mobile: 'subtitle', render: (r) => formatDate(r.docDate) },
    { key: 'mode', header: 'Paid by', mobile: 'hidden', render: (r) => `${paymentModeLabels[r.mode]}${r.reference ? ` · ${r.reference}` : ''}` },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatINR(Number(r.amount)) },
    { key: 'status', header: '', mobile: 'badge', render: (r) => (r.status === 'CANCELLED' ? <Badge>Cancelled</Badge> : null) },
    {
      key: 'act', header: '', align: 'right', mobile: 'hidden',
      render: (r) => (
        <span className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="rounded-control p-1 text-muted hover:text-brand" aria-label={`Print ${r.docNo}`} onClick={() => printFee(r.id)}><IconPrinter size={18} /></button>
          {r.status === 'POSTED' && <button type="button" className="text-sm text-muted hover:text-danger" onClick={() => setCancelling(r)}>Cancel</button>}
        </span>
      ),
    },
  ]
  return (
    <>
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input icon={IconSearch} aria-label="Search receipts" placeholder="Receipt no., name or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="md:w-96" />
        <div className="flex items-center justify-between gap-3">
          {q.data && <span className="text-sm text-muted">Received <b className="text-ink">{formatINR(q.data.totalReceived)}</b></span>}
          <ExportButton path="/training/fees/export" params={filters} />
        </div>
      </div>
      <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} order={order} onOrder={(o) => { setOrder(o); setPage(1) }} className="mb-4" />
      <Card bodyClassName="p-0">
        {q.error ? <EmptyState title="Couldn't load" description={q.error} /> : (
          <>
            <DataTable startIndex={(page - 1) * 20 + 1} columns={columns} rows={q.data?.items ?? []} rowKey={(r) => r.id} loading={q.loading} emptyTitle="No fees received yet" onRowClick={(r) => navigate(`/training/students/${r.enrolment.student.id}`)} />
            {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
      {cancelling && <CancelDocModal docNo={cancelling.docNo} effect="The amount goes back to the student's balance due and comes off cash / bank." onCancel={(r) => trainingApi.cancelReceipt(cancelling.id, r)} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); q.reload() }} />}
    </>
  )
}
