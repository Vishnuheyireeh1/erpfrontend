import { IconCircleCheck, IconAlertTriangle } from '@tabler/icons-react'
import { useState } from 'react'
import { Card, StatCard } from '@/components/ui/Card'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { todayISO } from '@/features/inventory/constants'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { accountsApi } from '../api/accounts.api'
import { AmountList } from './AmountList'

// Accounts → Balance sheet: on a date, what the shop owns = what it owes + its net worth (capital and profit).
export function BalanceSheetView({ onOpen }: { onOpen: (code: string) => void }) {
  const [to, setTo] = useState(todayISO)
  const q = useApiQuery(['balance-sheet', to], () => accountsApi.balanceSheet(to || undefined))
  const b = q.data ?? q.lastData

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Input label="As on" type="date" max={todayISO()} value={to} onChange={(e) => setTo(e.target.value)} className="sm:w-52" />
        <ExportButton path="/accounts/balance-sheet/export" params={{ to }} />
      </div>
      {q.error && !b ? (
        <Card><EmptyState title="Couldn't load" description={q.error} /></Card>
      ) : !b ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="The shop owns" value={formatINR(b.assetsTotal)} note="Cash, bank, stock, dues to collect" />
            <StatCard label="The shop owes" value={formatINR(b.liabilitiesTotal)} note="Suppliers, tailors, GST, advances" />
            <StatCard label="Shop's net worth" value={formatINR(b.equityTotal)} note="What it owns − what it owes" noteTone="success" />
          </div>
          <p className={b.balanced ? 'mb-4 flex items-center gap-2 text-sm text-success' : 'mb-4 flex items-center gap-2 text-sm text-danger'}>
            {b.balanced ? <IconCircleCheck size={18} /> : <IconAlertTriangle size={18} />}
            {b.balanced ? `Balanced on ${formatDate(b.to)}: owns ${formatINR(b.assetsTotal)} = owes ${formatINR(b.liabilitiesTotal)} + net worth ${formatINR(b.equityTotal)}` : 'Not balanced — please tell the developer'}
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
            <Card title="What the shop owns (assets)">
              <AmountList lines={b.assets} total={{ label: 'Total', value: b.assetsTotal }} onOpen={onOpen} />
            </Card>
            <div className="flex flex-col gap-4">
              <Card title="What the shop owes (liabilities)">
                <AmountList lines={b.liabilities} total={{ label: 'Total', value: b.liabilitiesTotal }} empty="Nothing owed." onOpen={onOpen} />
              </Card>
              <Card title="Net worth (capital & profit)">
                <AmountList lines={b.equity} total={{ label: 'Total', value: b.equityTotal }} onOpen={onOpen} />
              </Card>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Tap an account to see its entries. A minus in assets (e.g. bank) means it is overdrawn. Customers with an advance are shown under "owes".</p>
        </>
      )}
    </>
  )
}
