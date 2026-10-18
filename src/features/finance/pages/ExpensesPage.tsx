import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { Tabs } from '@/components/ui/Tabs'
import { todayISO } from '@/features/inventory/constants'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { financeApi, type CostKind, type CostRow } from '../api/finance.api'
import { AllCostsView } from '../components/AllCostsView'
import { ExpenseModal } from '../components/ExpenseModal'
import { ExpenseTypeList } from '../components/ExpenseTypeList'
import { useListOrder } from '@/lib/useListOrder'

// /expenses — every cost the shop has (typed: rent, electricity, tea … + automatic: salary, per-piece pay, job costs)
// with All / Direct / Indirect totals, and the expense types.
export function ExpensesPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'types' ? 'types' : 'list'
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<DateRangeValue>(() => ({ from: `${todayISO().slice(0, 8)}01`, to: todayISO() }))
  const [version, setVersion] = useState(0)
  const [order, setOrder] = useListOrder('expenses')
  const [kind, setKind] = useState<CostKind | ''>('')
  const [adding, setAdding] = useState(false)
  const [cancelling, setCancelling] = useState<CostRow | null>(null)
  const from = range.from || `${todayISO().slice(0, 8)}01`
  const to = range.to || todayISO()

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Every cost — rent, electricity, tea … plus salary and per-piece pay that come in automatically."
        actions={tab === 'list' && <Button variant="primary" icon={IconPlus} onClick={() => setAdding(true)}>Add expense</Button>}
      />
      <div className="mb-4">
        <Tabs tabs={[{ key: 'list', label: 'Expenses' }, { key: 'types', label: 'Expense types' }]} active={tab} onChange={(t) => setParams(t === 'list' ? {} : { tab: t })} />
      </div>
      {tab === 'types' ? (
        <ExpenseTypeList />
      ) : (
        <>
          <DateRange value={range} onChange={setRange} className="mb-3" order={order} onOrder={setOrder} />
          <AllCostsView from={from} to={to} order={order} kind={kind} search={search} version={version} onKind={setKind} onSearch={setSearch} onCancel={setCancelling} />
        </>
      )}
      {adding && <ExpenseModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); setVersion((v) => v + 1) }} />}
      {cancelling && (
        <CancelDocModal docNo={cancelling.docNo} effect="The money comes back into cash / bank in the day book." onCancel={(r) => financeApi.cancelExpense(cancelling.refId, r)} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); setVersion((v) => v + 1) }} />
      )}
    </>
  )
}
