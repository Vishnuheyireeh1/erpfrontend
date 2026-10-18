import { IconCash } from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { todayISO } from '@/features/inventory/constants'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { dayBookKinds, financeApi } from '../api/finance.api'
import type { AccountTotals, DayBookRow } from '../types'
import { TallyModal } from './TallyModal'
import { useListOrder } from '@/lib/useListOrder'

const columns: Column<DayBookRow>[] = [
  {
    key: 'what', header: 'What', mobile: 'title',
    render: (r) => {
      const k = dayBookKinds[r.kind]
      return (
        <span className="block min-w-0">
          <span className="block font-medium text-ink">{k?.label ?? r.kind}</span>
          <span className="block text-xs text-muted">{k?.link ? <Link to={k.link(r.refId)} className="text-brand hover:underline">{r.docNo}</Link> : r.docNo}{r.party ? ` · ${r.party}` : ''}</span>
        </span>
      )
    },
  },
  { key: 'when', header: 'Date', mobile: 'subtitle', render: (r) => `${formatDate(r.date)} ${new Date(r.time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}` },
  { key: 'mode', header: 'Mode', mobile: 'subtitle', render: (r) => `${paymentModeLabels[r.mode]} (${r.account === 'CASH' ? 'cash' : 'bank'})` },
  { key: 'in', header: 'In', align: 'right', render: (r) => (r.in ? <span className="font-medium text-success">+ {formatINR(r.in)}</span> : '') },
  { key: 'out', header: 'Out', align: 'right', mobile: 'badge', render: (r) => (r.out ? <span className="font-medium text-danger">− {formatINR(r.out)}</span> : '') },
]

function AccountCard({ title, t, action }: { title: string; t?: AccountTotals; action?: React.ReactNode }) {
  const row = (l: string, v: number | undefined, cls = '') => <div className={`flex justify-between text-sm ${cls}`}><span className="text-muted">{l}</span><span>{v === undefined ? '…' : formatINR(v)}</span></div>
  return (
    <Card title={title} actions={action}>
      <div className="flex flex-col gap-1">
        {row('Opening', t?.opening)}
        {row('Money in', t?.in)}
        {row('Money out', t?.out)}
        <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><span>Closing</span><span>{t ? formatINR(t.closing) : '…'}</span></div>
      </div>
    </Card>
  )
}

// Cash & day book → "Day book": every rupee in and out, split into cash in hand and bank.
export function DayBookView() {
  const [range, setRange] = useState<DateRangeValue>(() => ({ from: todayISO(), to: todayISO() }))
  const [counting, setCounting] = useState(false)
  const from = range.from || todayISO(), to = range.to || from
  const [order, setOrder] = useListOrder('day-book')
  const q = useApiQuery(['day-book', from, to, order], () => financeApi.dayBook(from, to, order))
  const d = q.data ?? q.lastData

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DateRange value={range} onChange={setRange} order={order} onOrder={setOrder} />
        <ExportButton path="/finance/day-book/export" params={{ from, to, order }} />
      </div>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <AccountCard title="Cash in hand" t={d?.totals.cash} action={from === to && <Button icon={IconCash} onClick={() => setCounting(true)}>Count cash</Button>} />
        <AccountCard title="Bank (UPI · card · transfer · cheque)" t={d?.totals.bank} />
      </div>
      {d && (
        <div className="mb-4 flex flex-wrap gap-2">
          {d.byMode.filter((m) => m.in || m.out).map((m) => (
            <span key={m.mode} className="rounded-control border border-line bg-card px-2.5 py-1 text-xs text-ink-soft">
              {paymentModeLabels[m.mode]}: <span className="font-semibold text-success">+{formatINR(m.in)}</span> / <span className="font-semibold text-danger">−{formatINR(m.out)}</span>
            </span>
          ))}
        </div>
      )}
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load the day book" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <DataTable columns={columns} rows={q.data?.rows ?? []} rowKey={(r) => `${r.kind}-${r.refId}-${r.docNo}-${r.mode}-${r.in}-${r.out}`} loading={q.loading} emptyTitle="No money in or out on these dates" />
        )}
      </Card>
      {counting && <TallyModal date={from} onClose={() => setCounting(false)} onSaved={() => { setCounting(false); q.reload() }} />}
    </>
  )
}
