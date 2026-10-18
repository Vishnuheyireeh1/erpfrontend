import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { formatDate, formatINR2 } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { drCr, kindLabel, money, useYearRange } from '../accountsUtils'
import { accountsApi } from '../api/accounts.api'
import type { TbLine } from '../types'

const columns: Column<TbLine>[] = [
  { key: 'code', header: 'Code', mobile: 'hidden', render: (l) => <span className="font-mono text-xs text-muted">{l.code}</span> },
  { key: 'name', header: 'Account', mobile: 'title', render: (l) => <span className="font-medium text-ink">{l.name}</span> },
  { key: 'kind', header: 'Group', mobile: 'subtitle', render: (l) => <span className="text-xs text-muted">{kindLabel[l.kind]}</span> },
  { key: 'opening', header: 'Opening', align: 'right', render: (l) => drCr(l.opening) },
  { key: 'debit', header: 'Debit', align: 'right', render: (l) => money(l.debit) },
  { key: 'credit', header: 'Credit', align: 'right', render: (l) => money(l.credit) },
  { key: 'dr', header: 'Closing Dr', align: 'right', mobile: 'hidden', render: (l) => (l.closing > 0.004 ? formatINR2(l.closing) : '') },
  { key: 'cr', header: 'Closing Cr', align: 'right', mobile: 'hidden', render: (l) => (l.closing < -0.004 ? formatINR2(-l.closing) : '') },
  { key: 'closing', header: 'Closing', align: 'right', mobile: 'badge', render: (l) => <span className="font-medium lg:hidden">{drCr(l.closing)}</span> },
]

// Accounts → Trial balance: every account with its debits and credits. Closing Dr total = Cr total → books are right.
export function TrialBalanceView({ onOpen }: { onOpen: (code: string) => void }) {
  const { range, setRange, from, to } = useYearRange()
  const q = useApiQuery(['trial-balance', from, to], () => accountsApi.trialBalance({ from, to }))
  const t = q.data ?? q.lastData
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <DateRange value={range} onChange={setRange} />
        <ExportButton path="/accounts/trial-balance/export" params={{ from, to }} />
      </div>
      {t && (
        <p className={t.balanced ? 'mb-3 flex items-center gap-2 text-sm text-success' : 'mb-3 flex items-center gap-2 text-sm text-danger'}>
          {t.balanced ? <IconCircleCheck size={18} /> : <IconAlertTriangle size={18} />}
          {t.balanced ? `Balanced — closing debit ${formatINR2(t.totals.closingDr)} = credit ${formatINR2(t.totals.closingCr)} (${formatDate(t.from)} to ${formatDate(t.to)})` : 'Not balanced — please tell the developer'}
        </p>
      )}
      <Card bodyClassName="p-0">
        {q.error && !t ? (
          <EmptyState title="Couldn't load" description={q.error} />
        ) : (
          <>
            <DataTable columns={columns} rows={t?.lines ?? []} rowKey={(l) => l.code} loading={!t} emptyTitle="No entries yet" onRowClick={(l) => /^(\d|E)/.test(l.code) && onOpen(l.code)} />
            {t && t.lines.length > 0 && (
              <div className="grid grid-cols-2 gap-2 border-t border-line bg-page px-4 py-3 text-sm font-semibold text-ink sm:grid-cols-4">
                <span>Debit {formatINR2(t.totals.debit)}</span>
                <span>Credit {formatINR2(t.totals.credit)}</span>
                <span>Closing Dr {formatINR2(t.totals.closingDr)}</span>
                <span>Closing Cr {formatINR2(t.totals.closingCr)}</span>
              </div>
            )}
          </>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Dr = debit (assets and costs grow here), Cr = credit (what is owed, capital and income grow here). Income and cost accounts start again every 1 April. Tap an account to see its entries.</p>
    </>
  )
}
