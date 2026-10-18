import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { BalanceSheetView } from '../components/BalanceSheetView'
import { BooksProfitView } from '../components/BooksProfitView'
import { ChartView } from '../components/ChartView'
import { JournalsView } from '../components/JournalsView'
import { LedgerView } from '../components/LedgerView'
import { TrialBalanceView } from '../components/TrialBalanceView'

const tabs = [
  { key: 'balance', label: 'Balance sheet' },
  { key: 'profit', label: 'Profit & loss' },
  { key: 'trial', label: 'Trial balance' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'journal', label: 'Journal entries' },
  { key: 'chart', label: 'Chart of accounts' },
] as const
type Tab = (typeof tabs)[number]['key']

// /accounts — the books (double entry), made automatically from every bill, job, purchase, payment, salary and
// expense. For the owner and the CA: balance sheet, P&L, trial balance, ledgers, journal entries, chart of accounts.
export function AccountsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (tabs.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'balance') as Tab
  const openLedger = (code: string, party = '') => setParams({ tab: 'ledger', code, ...(party ? { party } : {}) })

  return (
    <>
      <PageHeader title="Accounts" subtitle="The shop's books — filled in automatically from every bill, job, purchase, payment, salary and expense. Download Excel for the CA." />
      <div className="mb-4">
        <Tabs tabs={[...tabs]} active={tab} onChange={(t) => setParams(t === 'balance' ? {} : { tab: t })} />
      </div>
      {tab === 'balance' && <BalanceSheetView onOpen={(c) => openLedger(c)} />}
      {tab === 'profit' && <BooksProfitView onOpen={(c) => openLedger(c)} />}
      {tab === 'trial' && <TrialBalanceView onOpen={(c) => openLedger(c)} />}
      {tab === 'ledger' && <LedgerView code={params.get('code') ?? ''} party={params.get('party') ?? ''} onChange={openLedger} />}
      {tab === 'journal' && <JournalsView />}
      {tab === 'chart' && <ChartView onOpen={(c) => openLedger(c)} />}
    </>
  )
}
