import { IconBuildingStore, IconPlus, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { paymentModeLabels, purchaseApi } from '../api/purchase.api'
import type { BillSummary, Payment } from '../types'
import { useListOrder } from '@/lib/useListOrder'

const billColumns: Column<BillSummary>[] = [
  { key: 'docNo', header: 'Bill', mobile: 'title', render: (b) => <span className="font-medium text-brand">{b.docNo}</span> },
  { key: 'supplier', header: 'Supplier', mobile: 'subtitle', render: (b) => b.supplier.name },
  { key: 'supBill', header: 'Supplier bill', mobile: 'hidden', render: (b) => <span className="text-ink-soft">{b.supplierInvoiceNo}</span> },
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (b) => formatDate(b.docDate) },
  { key: 'total', header: 'Total', align: 'right', render: (b) => formatINR(Number(b.grandTotal)) },
  { key: 'due', header: 'Due', align: 'right', render: (b) => (b.status === 'CANCELLED' ? '—' : <span className={b.dueAmount > 0 ? 'font-medium text-warn' : 'text-success'}>{b.dueAmount > 0 ? formatINR(b.dueAmount) : 'Paid'}</span>) },
  { key: 'status', header: 'Status', mobile: 'badge', render: (b) => (b.status === 'CANCELLED' ? <Badge>Cancelled</Badge> : b.dueAmount > 0 ? (Number(b.paidAmount) > 0 ? <Badge tone="pending">Part paid</Badge> : <Badge tone="warn">Unpaid</Badge>) : <Badge tone="success">Paid</Badge>) },
]

const paymentColumns: Column<Payment>[] = [
  { key: 'docNo', header: 'Payment', mobile: 'title', render: (p) => <span className="font-medium text-brand">{p.docNo}</span> },
  { key: 'supplier', header: 'Supplier', mobile: 'subtitle', render: (p) => p.supplier.name },
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (p) => formatDate(p.docDate) },
  { key: 'mode', header: 'Paid by', render: (p) => `${paymentModeLabels[p.mode]}${p.reference ? ` · ${p.reference}` : ''}` },
  { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatINR(Number(p.amount)) },
  { key: 'status', header: 'Status', mobile: 'badge', render: (p) => <Badge tone={p.status === 'POSTED' ? 'success' : 'neutral'}>{p.status === 'POSTED' ? 'Posted' : 'Cancelled'}</Badge> },
]

type Tab = 'all' | 'unpaid' | 'CANCELLED' | 'payments'

// /purchase — purchase bills (all / unpaid / cancelled) and supplier payments.
export function PurchaseListPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const [order, setOrder] = useListOrder('purchase')
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search.trim())
  const isPayments = tab === 'payments'
  const filters = { order, search: debounced || undefined, status: isPayments ? 'all' : tab, from: range.from || undefined, to: range.to || undefined }
  const params = { ...filters, page }
  const bills = useApiQuery(['bills', params, isPayments], () => (isPayments ? Promise.resolve(null) : purchaseApi.list(params)))
  const payments = useApiQuery(['payments', params, isPayments], () => (isPayments ? purchaseApi.payments(params) : Promise.resolve(null)))
  const active = isPayments ? payments : bills
  const total = active.data?.total ?? 0

  return (
    <>
      <PageHeader
        title="Purchase"
        subtitle="Supplier bills — stock comes in here."
        actions={
          <>
            <ExportButton path={isPayments ? '/supplier-payments/export' : '/purchases/export'} params={filters} />
            <Button icon={IconBuildingStore} onClick={() => navigate('/suppliers')}>Suppliers</Button>
            <Button variant="primary" icon={IconPlus} onClick={() => navigate('/purchase/new')}>New purchase bill</Button>
          </>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[{ key: 'all', label: 'All bills' }, { key: 'unpaid', label: 'Unpaid' }, { key: 'CANCELLED', label: 'Cancelled' }, { key: 'payments', label: 'Payments' }]}
          active={tab}
          onChange={(t) => { setTab(t); setPage(1) }}
        />
      </div>
      <Input icon={IconSearch} aria-label="Search" placeholder={isPayments ? 'Payment no., reference or supplier' : 'Bill no., supplier bill no. or supplier'} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="mb-3 md:w-96" />
      <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} order={order} onOrder={(o) => { setOrder(o); setPage(1) }} className="mb-4" />
      <Card bodyClassName="p-0">
        {active.error ? (
          <EmptyState title="Couldn't load" description={active.error} action={<Button onClick={active.reload}>Try again</Button>} />
        ) : isPayments ? (
          <DataTable startIndex={(page - 1) * 20 + 1} columns={paymentColumns} rows={payments.data?.items ?? []} rowKey={(p) => p.id} loading={payments.loading} emptyTitle="No payments yet" onRowClick={(p) => navigate(`/purchase/payments/${p.id}`)} />
        ) : (
          <DataTable
            startIndex={(page - 1) * 20 + 1}
            columns={billColumns}
            rows={bills.data?.items ?? []}
            rowKey={(b) => b.id}
            loading={bills.loading}
            emptyTitle={tab === 'unpaid' ? 'No unpaid bills' : 'No purchase bills yet'}
            emptyDescription={tab === 'all' ? 'Enter supplier bills here — stock goes up automatically.' : undefined}
            onRowClick={(b) => navigate(`/purchase/${b.id}`)}
          />
        )}
        {total > 20 && <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />}
      </Card>
    </>
  )
}
