import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/useApiQuery'
import { financeApi } from '../api/finance.api'
import type { ExpenseCategory, ExpenseKind } from '../types'

const kindLabel = { INDIRECT: 'Shop expense (indirect)', DIRECT: 'Direct cost (stitching / making)', ASSET: 'Asset — lasts years (AC, machine, furniture)' }
const kindHint = {
  INDIRECT: 'Shop running cost — in Profit & loss',
  DIRECT: 'Cost of stitching / making — in Profit & loss',
  ASSET: 'Not a cost: goes to "What the shop owns" in the Balance sheet',
}

// Expenses page → "Expense types" tab.
export function ExpenseTypeList() {
  const toast = useToast()
  const q = useApiQuery('expense-categories', () => financeApi.categories())
  const [editing, setEditing] = useState<ExpenseCategory | 'new' | null>(null)
  const [form, setForm] = useState({ name: '', kind: 'INDIRECT' as ExpenseKind, isActive: true })
  const [busy, setBusy] = useState(false)

  const open = (c: ExpenseCategory | 'new') => {
    setEditing(c)
    setForm(c === 'new' ? { name: '', kind: 'INDIRECT', isActive: true } : { name: c.name, kind: c.kind, isActive: c.isActive })
  }
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(msg)
      setEditing(null)
      q.reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  const save = () => {
    if (!form.name.trim()) return toast.error('Enter the name')
    const current = editing === 'new' ? null : editing
    return run(() => financeApi.saveCategory(current?.id ?? null, { ...form, name: form.name.trim(), sortOrder: current?.sortOrder ?? 500 }), 'Saved')
  }

  const columns: Column<ExpenseCategory>[] = [
    { key: 'name', header: 'Expense type', mobile: 'title', render: (c) => <span className="font-medium text-ink">{c.name}</span> },
    { key: 'kind', header: 'Counts as', mobile: 'subtitle', render: (c) => kindLabel[c.kind] },
    { key: 'used', header: 'Used', align: 'right', mobile: 'hidden', render: (c) => `${c.used ?? 0} expense(s)` },
    { key: 'status', header: '', mobile: 'badge', render: (c) => (!c.isActive ? <Badge>Inactive</Badge> : null) },
  ]

  return (
    <>
      <div className="mb-4 flex justify-end"><Button variant="primary" icon={IconPlus} onClick={() => open('new')}>Add expense type</Button></div>
      <Card bodyClassName="p-0"><DataTable columns={columns} rows={q.data ?? []} rowKey={(c) => c.id} loading={q.loading} emptyTitle="No expense types" onRowClick={open} /></Card>
      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          size="sm"
          title={editing === 'new' ? 'Add expense type' : `Edit ${editing.name}`}
          footer={
            <>
              {editing !== 'new' && <Button variant="danger" className="sm:mr-auto" disabled={busy} onClick={() => run(() => financeApi.removeCategory(editing.id), 'Deleted')}>Delete</Button>}
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" loading={busy} onClick={save}>Save</Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Generator diesel" autoFocus />
            <Select label="Counts as" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as ExpenseKind }))} options={(['INDIRECT', 'DIRECT', 'ASSET'] as const).map((k) => ({ value: k, label: kindLabel[k] }))} hint={kindHint[form.kind]} />
            <Switch label="Active" checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
          </div>
        </Modal>
      )}
    </>
  )
}
