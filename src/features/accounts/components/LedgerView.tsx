import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Select'
import { formatDate } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { drCr, kindLabel, money, srcLabel, srcLink, useYearRange } from '../accountsUtils'
import { accountsApi } from '../api/accounts.api'
import type { AccountKind, LedgerLine } from '../types'
import { SortSwitch } from '@/components/ui/DateRange'
import { inOrder, useListOrder } from '@/lib/useListOrder'

const columns: Column<LedgerLine>[] = [
  { key: 'date', header: 'Date', mobile: 'subtitle', render: (l) => formatDate(l.date) },
  {
    key: 'doc', header: 'Entry', mobile: 'title',
    render: (l) => {
      const to = srcLink(l.src, l.refId)
      return <span className="flex flex-col">{to ? <Link to={to} className="font-medium text-brand hover:underline">{l.docNo}</Link> : <span className="font-medium text-ink">{l.docNo}</span>}<span className="text-xs text-muted">{srcLabel(l.src)}</span></span>
    },
  },
  { key: 'details', header: 'Details', render: (l) => <span className="text-ink-soft">{[l.party, l.memo].filter(Boolean).join(' · ') || '—'}</span> },
  { key: 'debit', header: 'Debit', align: 'right', render: (l) => money(l.debit) },
  { key: 'credit', header: 'Credit', align: 'right', render: (l) => money(l.credit) },
  { key: 'balance', header: 'Balance', align: 'right', mobile: 'badge', render: (l) => <span className="font-medium">{drCr(l.balance)}</span> },
]

type Props = { code: string; party: string; onChange: (code: string, party: string) => void }

// Accounts → Ledger: every entry of one account (optionally one customer / supplier / tailor), running balance.
export function LedgerView({ code, party, onChange }: Props) {
  const { range, setRange, from, to } = useYearRange()
  const chart = useApiQuery('accounts-chart', () => accountsApi.chart())
  const account = chart.data?.items.find((a) => a.code === code)
  const parties = useApiQuery(['ledger-parties', account?.party ? code : '', to], () => (account?.party ? accountsApi.parties(code, to) : Promise.resolve([])))
  const [order, setOrder] = useListOrder('ledger')
  const q = useApiQuery(['ledger', code, party, from, to], () => (code ? accountsApi.ledger(code, { from, to, party: party || undefined }) : Promise.resolve(null)))
  const l = q.data ?? q.lastData

  const groups = (Object.keys(kindLabel) as AccountKind[]).map((k) => ({ k, items: (chart.data?.items ?? []).filter((a) => a.kind === k) }))
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Select label="Account" value={code} onChange={(e) => onChange(e.target.value, '')} placeholder="Choose the account…"
          options={groups.flatMap((g) => g.items.map((a) => ({ value: a.code, label: `${a.code} · ${a.name} · ${kindLabel[g.k]}` })))} />
        {account?.party ? (
          <Select label={`Which ${account.party}`} value={party} onChange={(e) => onChange(code, e.target.value)} placeholder={`All ${account.party}s`} options={(parties.data ?? []).map((p) => ({ value: p.code, label: `${p.name} — ${drCr(p.balance)}` }))} />
        ) : <div className="hidden md:block" />}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:justify-end">
          <DateRange value={range} onChange={setRange} />
          {code && <ExportButton path={`/accounts/ledger/${encodeURIComponent(code)}/export`} params={{ from, to, party: party || undefined }} />}
        </div>
      </div>

      {!code ? (
        <Card><EmptyState title="Choose an account" description="See every entry of cash, bank, a customer, a supplier, sales, an expense … with the running balance." /></Card>
      ) : q.error && !l ? (
        <Card><EmptyState title="Couldn't load" description={q.error} /></Card>
      ) : (
        <Card bodyClassName="p-0">
          {l && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2"><p className="text-xs text-muted">{l.account.hint}</p><SortSwitch order={order} onOrder={setOrder} /></div>}
          {l && <div className="flex justify-between gap-3 border-b border-line bg-page px-4 py-2 text-sm"><span className="text-muted">Opening balance ({formatDate(l.from)})</span><span className="font-medium">{drCr(l.opening)}</span></div>}
          <DataTable columns={columns} rows={inOrder((l?.lines ?? []).map((x, i) => ({ ...x, key: i })), order, 'oldest')} rowKey={(x) => x.key ?? 0} loading={!l} emptyTitle="No entries in these dates" />
          {l && (
            <div className="flex flex-wrap justify-between gap-3 border-t border-line bg-page px-4 py-3 text-sm font-semibold text-ink">
              <span>Debit {money(l.totals.debit)} · Credit {money(l.totals.credit)}</span>
              <span>Closing {drCr(l.closing)}</span>
            </div>
          )}
          {l?.more && <p className="px-4 pb-3 text-xs text-warn">Showing the first 5,000 entries — download Excel for all.</p>}
        </Card>
      )}
    </>
  )
}
