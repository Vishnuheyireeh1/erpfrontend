import { IconBook2, IconPencil, IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { useApiQuery } from '@/lib/useApiQuery'
import { kindLabel } from '../accountsUtils'
import { accountsApi } from '../api/accounts.api'
import type { Account, AccountKind } from '../types'
import { AccountFormModal } from './AccountFormModal'

// Accounts → Chart of accounts: every "box" money goes into, grouped the way a CA reads them.
export function ChartView({ onOpen }: { onOpen: (code: string) => void }) {
  const q = useApiQuery('accounts-chart', () => accountsApi.chart())
  const [editing, setEditing] = useState<Account | 'new' | null>(null)
  if (q.error && !q.data) return <Card><EmptyState title="Couldn't load" description={q.error} /></Card>
  if (!q.data) return <div className="flex justify-center py-10"><Spinner /></div>
  const groups = (Object.keys(kindLabel) as AccountKind[]).map((k) => ({ k, items: q.data!.items.filter((a) => a.kind === k) }))

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Built-in accounts are filled automatically from bills, jobs, purchases, payments, salary and expenses. Add your own for machines, loans, depreciation …</p>
        <div className="flex shrink-0 gap-2">
          <ExportButton path="/accounts/chart/export" />
          <Button variant="primary" icon={IconPlus} onClick={() => setEditing('new')}>Add account</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {groups.map((g) => (
          <Card key={g.k} title={kindLabel[g.k]} bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {g.items.length === 0 && <li className="px-4 py-3 text-sm text-muted">None yet.</li>}
              {g.items.map((a) => (
                <li key={a.code} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-12 shrink-0 font-mono text-xs text-muted">{a.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">{a.name}</span>
                      {!a.builtIn && <Badge tone="info">Yours</Badge>}
                      {!a.isActive && <Badge tone="neutral">Inactive</Badge>}
                    </span>
                    <span className="block truncate text-xs text-muted">{a.hint}</span>
                  </span>
                  <button type="button" onClick={() => onOpen(a.code)} aria-label={`Open ${a.name} ledger`} title="See entries" className="rounded-control p-1.5 text-muted hover:bg-page hover:text-brand"><IconBook2 size={18} /></button>
                  {!a.builtIn && <button type="button" onClick={() => setEditing(a)} aria-label={`Edit ${a.name}`} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-brand"><IconPencil size={18} /></button>}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      {editing && <AccountFormModal account={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); q.reload() }} />}
    </>
  )
}
