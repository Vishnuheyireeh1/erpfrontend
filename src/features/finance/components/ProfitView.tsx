import { useState } from 'react'
import { Card, StatCard } from '@/components/ui/Card'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { todayISO } from '@/features/inventory/constants'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { financeApi } from '../api/finance.api'

const Line = ({ label, value, strong, minus }: { label: string; value: number; strong?: boolean; minus?: boolean }) => (
  <div className={cn('flex justify-between gap-3 text-sm', strong && 'border-t border-line pt-2 text-base font-semibold')}>
    <span className={strong ? 'text-ink' : 'text-ink-soft'}>{label}</span>
    <span className={cn(strong && value < 0 && 'text-danger')}>{minus && value ? '− ' : ''}{formatINR(value)}</span>
  </div>
)

// Cash & day book → "Profit & loss": did the shop make money in this period? (before GST)
export function ProfitView() {
  const [range, setRange] = useState<DateRangeValue>(() => ({ from: `${todayISO().slice(0, 8)}01`, to: todayISO() }))
  const from = range.from || `${todayISO().slice(0, 8)}01`, to = range.to || todayISO()
  const q = useApiQuery(['profit', from, to], () => financeApi.profit(from, to))
  const p = q.data ?? q.lastData

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DateRange value={range} onChange={setRange} />
        <ExportButton path="/finance/profit/export" params={{ from, to }} />
      </div>
      {q.error ? (
        <Card><EmptyState title="Couldn't load" description={q.error} /></Card>
      ) : !p ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Income" value={formatINR(p.income.total)} note="Before GST" />
            <StatCard label="Gross profit" value={formatINR(p.grossProfit)} note="After goods & direct costs" />
            <StatCard label="Shop expenses" value={formatINR(p.indirectTotal)} />
            <StatCard label="Net profit" value={formatINR(p.netProfit)} note={`${p.marginPct}% of income`} noteTone={p.netProfit < 0 ? 'warn' : 'success'} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Income and direct costs">
              <div className="flex flex-col gap-1.5">
                <Line label="Goods sold (counter + items on jobs − returns)" value={p.income.goodsSold} />
                <Line label="Stitching charges" value={p.income.stitching} />
                {p.income.brands > 0 && <Line label="Brand stitching (delivery bills)" value={p.income.brands} />}
                {p.income.training > 0 && <Line label="Training fees" value={p.income.training} />}
                {p.income.otherIncome > 0 && <Line label="Other income" value={p.income.otherIncome} />}
                <Line label="Total income" value={p.income.total} strong />
                <Line label="Stock cost of goods sold" value={p.costOfGoods} minus />
                {p.direct.map((d) => <Line key={d.name} label={d.name} value={d.amount} minus />)}
                <Line label="Gross profit" value={p.grossProfit} strong />
              </div>
            </Card>
            <Card title="Shop expenses">
              <div className="flex flex-col gap-1.5">
                {p.indirect.length === 0 && <p className="text-sm text-muted">No expenses in this period.</p>}
                {p.indirect.map((d) => <Line key={d.name} label={d.name} value={d.amount} minus />)}
                <Line label="Total shop expenses" value={p.indirectTotal} strong />
                <Line label="Net profit" value={p.netProfit} strong />
              </div>
              <p className="mt-3 text-xs text-muted">All amounts before GST. All staff salary (shop and workshop) is a shop expense, counted in the month it is for — only per-piece worker pay is a direct cost.</p>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
