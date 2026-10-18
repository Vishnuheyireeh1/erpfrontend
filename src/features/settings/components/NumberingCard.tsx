import { IconEdit } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Feedback'
import { useApiQuery } from '@/lib/useApiQuery'
import { numberingApi, type Series } from '../numbering'
import { NumberingModal } from './NumberingModal'

// Settings → Document numbers: how every bill / receipt / voucher is numbered, and the next number.
export function NumberingCard() {
  const q = useApiQuery('numbering', () => numberingApi.list())
  const [editing, setEditing] = useState<Series | null>(null)
  const data = q.data ?? q.lastData

  return (
    <Card title="Document numbers" bodyClassName="p-0">
      <p className="border-b border-line px-4 py-3 text-xs text-muted">
        Each document type has its own letters and layout. Press Edit to change them or to continue from the old bill book. Numbers only move forward — never reused.
      </p>
      {!data ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <ul className="divide-y divide-line">
          {data.items.map((s) => (
            <li key={s.key} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{s.label}</p>
                <p className="truncate text-xs text-muted">
                  next <span className="font-mono text-ink">{s.nextDocNo}</span> · {s.yearly ? 'restarts every April' : 'keeps counting'}
                </p>
              </div>
              <Button size="sm" icon={IconEdit} onClick={() => setEditing(s)}>Edit</Button>
            </li>
          ))}
        </ul>
      )}
      {editing && data && <NumberingModal key={editing.key} series={editing} layouts={data.layouts} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); q.reload() }} />}
    </Card>
  )
}
