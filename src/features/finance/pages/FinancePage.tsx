import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { financeApi } from '../api/finance.api'
import { DayBookView } from '../components/DayBookView'
import { MovementsView } from '../components/MovementsView'
import { ProfitView } from '../components/ProfitView'
import type { CashTally } from '../types'
import { SortSwitch } from '@/components/ui/DateRange'
import { useListOrder } from '@/lib/useListOrder'

type Tab = 'daybook' | 'moves' | 'tally' | 'profit'

const tallyColumns: Column<CashTally>[] = [
  { key: 'date', header: 'Date', mobile: 'title', render: (t) => <span className="font-medium text-ink">{formatDate(t.date)}</span> },
  { key: 'expected', header: 'System cash', align: 'right', render: (t) => formatINR(Number(t.expected)) },
  { key: 'counted', header: 'Counted', align: 'right', render: (t) => formatINR(Number(t.counted)) },
  {
    key: 'diff', header: 'Difference', align: 'right', mobile: 'badge',
    render: (t) => { const d = Number(t.difference); return <span className={cn('font-medium', d === 0 ? 'text-success' : 'text-danger')}>{d === 0 ? 'Tallies' : d < 0 ? `Short ${formatINR(-d)}` : `Extra ${formatINR(d)}`}</span> },
  },
  { key: 'note', header: 'Note', mobile: 'subtitle', render: (t) => `${t.note ?? ''}${t.note ? ' · ' : ''}${t.createdBy}` },
]

function TallyHistory() {
  const [order, setOrder] = useListOrder('cash-counts')
  const q = useApiQuery(['tally-history', order], () => financeApi.tallyHistory(order))
  return <><div className="mb-3 flex justify-end"><SortSwitch order={order} onOrder={setOrder} /></div><Card bodyClassName="p-0"><DataTable columns={tallyColumns} rows={q.data ?? []} rowKey={(t) => t.id} loading={q.loading} emptyTitle="No cash counts yet" emptyDescription="Use 'Count cash' on the day book each evening." /></Card></>
}

// /finance — day book (cash & bank), money in / out, cash counts, profit & loss.
export function FinancePage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'daybook'
  return (
    <>
      <PageHeader title="Cash & day book" subtitle="Every rupee in and out — cash in hand, bank, and whether the shop is making money." />
      <div className="mb-4">
        <Tabs
          tabs={[{ key: 'daybook', label: 'Day book' }, { key: 'moves', label: 'Money in / out' }, { key: 'tally', label: 'Cash counts' }, { key: 'profit', label: 'Profit & loss' }]}
          active={tab}
          onChange={(t) => setParams(t === 'daybook' ? {} : { tab: t })}
        />
      </div>
      {tab === 'daybook' && <DayBookView />}
      {tab === 'moves' && <MovementsView />}
      {tab === 'tally' && <TallyHistory />}
      {tab === 'profit' && <ProfitView />}
    </>
  )
}
