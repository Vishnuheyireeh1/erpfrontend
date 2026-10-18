import { IconAlertTriangle, IconCash, IconCurrencyRupee, IconNeedleThread, IconPlus, IconRefresh, IconScissors } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { reportsApi } from '@/features/reports/api/reports.api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { DueJobsCard, LowStockCard, NoCostJobsCard, TopItemsCard } from '../components/DashboardLists'
import { SalesChart } from '../components/SalesChart'

// Greeting + date, computed once when the page opens.
function readToday() {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 16 ? 'Good afternoon' : 'Good evening'
  const date = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return { greeting, date }
}

const vsYesterday = (today: number, yesterday: number) => {
  if (!yesterday) return today ? 'No sales yesterday' : 'No sales yet today'
  const pct = Math.round(((today - yesterday) / yesterday) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}% vs yesterday (${formatINR(yesterday)})`
}

const Row = ({ label, value, to, tone }: { label: string; value: string; to?: string; tone?: string }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
    {to ? <Link to={to} className="text-ink-soft hover:text-brand">{label}</Link> : <span className="text-ink-soft">{label}</span>}
    <span className={tone ?? 'font-medium text-ink'}>{value}</span>
  </div>
)

// Home: today's sales and money, jobs to watch, low stock, what is owed — live numbers.
export function DashboardPage() {
  const navigate = useNavigate()
  const [today] = useState(readToday)
  const q = useApiQuery('dashboard', () => reportsApi.dashboard())
  const d = q.data ?? q.lastData

  return (
    <>
      <PageHeader
        title={`${today.greeting}, Sairandhri 👋`}
        subtitle={today.date}
        actions={
          <>
            <Button icon={IconRefresh} onClick={q.reload} loading={q.loading && !!d} aria-label="Refresh">Refresh</Button>
            <Button icon={IconScissors} onClick={() => navigate('/billing?kind=job')}>New job</Button>
            <Button variant="primary" icon={IconPlus} onClick={() => navigate('/billing')}>New bill</Button>
          </>
        }
      />
      {q.error && !d ? (
        <Card><EmptyState title="Couldn't load the dashboard" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} /></Card>
      ) : !d ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Today's sales" value={formatINR(d.sales.today)} note={vsYesterday(d.sales.today, d.sales.yesterday)} noteTone={d.sales.today >= d.sales.yesterday ? 'success' : 'warn'} icon={IconCurrencyRupee} />
            <StatCard label="Money received today" value={formatINR(d.money.receivedToday)} note={`${d.sales.billCount} bills · ${d.sales.jobCount} jobs booked`} icon={IconCash} />
            <StatCard label="Jobs in work" value={String(d.jobs.open)} note={d.jobs.overdue ? `${d.jobs.overdue} late · ${d.jobs.ready} ready to hand over` : `${d.jobs.ready} ready to hand over`} noteTone={d.jobs.overdue ? 'warn' : 'muted'} icon={IconNeedleThread} />
            <StatCard label="Low stock" value={`${d.lowStock.count} items`} note={d.lowStock.count ? 'At or below alert level' : 'All fine'} noteTone={d.lowStock.count ? 'warn' : 'success'} icon={IconAlertTriangle} />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="Sales" className="lg:col-span-2" actions={<Link to="/reports" className="text-sm font-medium text-brand hover:underline">Reports</Link>}>
              <SalesChart days={d.sales.last14} today={d.today} />
            </Card>
            <Card title="Money">
              <div className="divide-y divide-line">
                <Row label="Cash in hand" value={formatINR(d.money.cash)} to="/finance" />
                <Row label="Bank" value={formatINR(d.money.bank)} to="/finance" />
                <Row label="Paid out today" value={formatINR(d.money.spentToday)} to="/finance" />
                <Row label={`Customers owe (${d.owed.customerDocs})`} value={formatINR(d.owed.byCustomers)} to="/sales?tab=unpaid" tone={d.owed.byCustomers ? 'font-medium text-warn' : undefined} />
                <Row label={`To pay suppliers (${d.owed.supplierBills})`} value={formatINR(d.owed.toSuppliers)} to="/purchase" tone={d.owed.toSuppliers ? 'font-medium text-warn' : undefined} />
                {(d.brands.pending > 0 || d.brands.openOrders > 0) && <Row label={`Brands owe (${d.brands.owing})`} value={formatINR(d.brands.pending)} to="/brands?tab=dues" tone={d.brands.pending ? 'font-medium text-warn' : undefined} />}
                {d.brands.openOrders > 0 && <Row label={`Brand orders open${d.brands.lateOrders ? ` · ${d.brands.lateOrders} late` : ''}`} value={`${d.brands.readyPieces} pcs ready`} to={d.brands.lateOrders ? '/brand-orders?view=late' : '/brand-orders'} tone={d.brands.lateOrders ? 'font-medium text-danger' : undefined} />}
                {d.owed.fees > 0 && <Row label={`Training fees due (${d.owed.feeStudents})`} value={formatINR(d.owed.fees)} to="/training?tab=pending" tone="font-medium text-warn" />}
                <Row label="This month's profit" value={formatINR(d.month.netProfit)} to="/finance?tab=profit" tone={d.month.netProfit < 0 ? 'font-medium text-danger' : 'font-medium text-success'} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-5 lg:col-span-2">
              <DueJobsCard jobs={d.jobs.due} />
              <NoCostJobsCard data={d.noCost} />
            </div>
            <div className="flex flex-col gap-4">
              <LowStockCard low={d.lowStock} />
              <TopItemsCard items={d.topItems} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
