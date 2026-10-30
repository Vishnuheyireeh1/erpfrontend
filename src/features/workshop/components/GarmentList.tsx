import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { garmentApi } from '../api/workshop.api'
import type { GarmentType } from '../types'
import { GarmentFormModal } from './GarmentFormModal'

// Garment types and their measurement templates (Tailors page → "Garment types" tab).
export function GarmentList() {
  const toast = useToast()
  const q = useApiQuery('garments', () => garmentApi.list())
  const [editing, setEditing] = useState<GarmentType | 'new' | null>(null)
  const [deleting, setDeleting] = useState<GarmentType | null>(null)
  const [busy, setBusy] = useState(false)

  const columns: Column<GarmentType>[] = [
    { key: 'name', header: 'Garment', mobile: 'title', render: (g) => <span className="font-medium text-ink">{g.name}</span> },
    { key: 'fields', header: 'Measurements', mobile: 'subtitle', render: (g) => <span className="line-clamp-2 text-ink-soft">{g.fields.length ? g.fields.join(', ') : 'Free notes only'}</span> },
    { key: 'charge', header: 'Usual charge', align: 'right', render: (g) => formatINR(Number(g.defaultCharge)) },
    { key: 'labour', header: 'Tailor pay', align: 'right', render: (g) => formatINR(Number(g.defaultLabour)) },
    { key: 'status', header: '', mobile: 'badge', render: (g) => (!g.isActive ? <Badge>Inactive</Badge> : null) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      mobile: 'row',
      render: (g) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); setDeleting(g) }} aria-label={`Delete ${g.name}`} className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-sm text-muted hover:bg-page hover:text-danger">
          <IconTrash size={16} /> Delete
        </button>
      ),
    },
  ]

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await garmentApi.remove(deleting.id)
      toast.success(`${deleting.name} deleted`)
      setDeleting(null)
      q.reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <ExportButton path="/garment-types/export" />
        <Button variant="primary" icon={IconPlus} onClick={() => setEditing('new')}>Add garment</Button>
      </div>
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load garments" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <DataTable columns={columns} rows={q.data ?? []} rowKey={(g) => g.id} loading={q.loading} emptyTitle="No garment types" onRowClick={(g) => setEditing(g)} />
        )}
      </Card>
      {editing && (
        <GarmentFormModal
          key={editing === 'new' ? 'new' : editing.id}
          garment={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); q.reload() }}
          onDelete={editing === 'new' ? undefined : () => { setDeleting(editing); setEditing(null) }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? ''}?`}
        message="Only possible while no jobs, brand orders or saved measurements use it. Otherwise make it Inactive (it stays on old bills but is not offered any more)."
        confirmLabel="Delete"
        danger
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
