import { Card, StatCard } from '@/components/ui/Card'
import { DateRange } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useYearRange } from '../accountsUtils'
import { accountsApi } from '../api/accounts.api'
import { AmountList } from './AmountList'

// Accounts → Profit & loss from the books: income − direct costs = gross profit; − shop expenses = net profit.
export function BooksProfitView({ onOpen }: { onOpen: (code: string) => void }) {
  const { range, setRange, from, to } = useYearRange()
  const q = useApiQuery(['books-pl', from, to], () => accountsApi.profitLoss({ from, to }))
  const p = q.data ?? q.lastData

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DateRange value={range} onChange={setRange} />
        <ExportButton path="/accounts/profit-loss/export" params={{ from, to }} />
      </div>
      {q.error && !p ? (
        <Card><EmptyState title="Couldn't load" description={q.error} /></Card>
      ) : !p ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Income" value={formatINR(p.incomeTotal)} note="Before GST" />
            <StatCard label="Gross profit" value={formatINR(p.grossProfit)} note="After direct costs" />
            <StatCard label="Shop expenses" value={formatINR(p.indirectTotal)} />
            <StatCard label="Net profit" value={formatINR(p.netProfit)} noteTone={p.netProfit < 0 ? 'warn' : 'success'} note={p.netProfit < 0 ? 'Loss' : 'Profit'} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
            <div className="flex flex-col gap-4">
              <Card title="Income">
                <AmountList lines={p.income} total={{ label: 'Total income', value: p.incomeTotal }} empty="No income in these dates." onOpen={onOpen} />
              </Card>
              <Card title="Direct costs">
                <AmountList lines={p.direct} total={{ label: 'Total direct costs', value: p.directTotal }} empty="No direct costs." onOpen={onOpen} />
                <div className="mt-3 flex justify-between gap-3 rounded-control bg-page px-3 py-2 font-semibold text-ink">
                  <span>Gross profit</span><span>{formatINR(p.grossProfit)}</span>
                </div>
              </Card>
            </div>
            <Card title="Shop expenses (indirect)">
              <AmountList lines={p.indirect} total={{ label: 'Total shop expenses', value: p.indirectTotal }} empty="No shop expenses." onOpen={onOpen} />
              <div className="mt-3 flex justify-between gap-3 rounded-control bg-page px-3 py-2 text-base font-semibold text-ink">
                <span>Net profit</span><span className={p.netProfit < 0 ? 'text-danger' : 'text-success'}>{formatINR(p.netProfit)}</span>
              </div>
              <p className="mt-3 text-xs text-muted">From the books (double entry). Amounts before GST. Sales returns and stock found on a count show as minus.</p>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
