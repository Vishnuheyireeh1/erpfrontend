import { IconPencil, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ExportButton } from '@/components/ui/ExportButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { useDebounce } from '@/lib/useDebounce'
import { mastersApi } from '../api/masters.api'
import { masterColumns } from '../config/masterColumns'
import type { MasterMeta } from '../config/masters.config'
import { useMainCategories } from '../hooks/useMainCategories'
import { useMasterList } from '../hooks/useMasterList'
import type { MasterRow, StatusFilter } from '../types'
import { MasterFormModal } from './MasterFormModal'

const PAGE_SIZE = 20

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// Search + filters + list + add/edit/delete for one master.
export function MasterPanel({ meta }: { meta: MasterMeta }) {
  const toast = useToast()
  const isCategory = meta.key === 'categories'
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [parentFilter, setParentFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<MasterRow | null | undefined>(undefined) // undefined = closed
  const [deleting, setDeleting] = useState<MasterRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const debouncedSearch = useDebounce(search.trim())
  const parentId = parentFilter === '' ? undefined : parentFilter === 'root' ? 'root' : Number(parentFilter)
  const list = useMasterList(meta.key, {
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
    status,
    parentId,
  })
  const mainCategories = useMainCategories(isCategory)

  const refreshAll = () => {
    list.reload()
    if (isCategory) mainCategories.refresh()
  }

  // Any filter change → back to page 1.
  const withReset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(1)
  }

  const columns = useMemo<Column<MasterRow>[]>(
    () => [
      ...masterColumns[meta.key],
      {
        key: 'actions',
        header: '',
        align: 'right',
        mobile: 'hidden',
        render: (row) => (
          <span className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setEditing(row)} className="rounded-control p-1.5 text-muted hover:bg-page hover:text-ink" aria-label={`Edit ${row.name}`}>
              <IconPencil size={18} stroke={1.6} />
            </button>
            <button type="button" onClick={() => setDeleting(row)} className="rounded-control p-1.5 text-muted hover:bg-danger-tint hover:text-danger" aria-label={`Delete ${row.name}`}>
              <IconTrash size={18} stroke={1.6} />
            </button>
          </span>
        ),
      },
    ],
    [meta.key],
  )

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await mastersApi.remove(meta.key, deleting.id)
      toast.success(`${deleting.name} deleted`)
      setEditing(undefined)
      refreshAll()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete')
    } finally {
      setDeleteBusy(false)
      setDeleting(null)
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
        <Input
          icon={IconSearch}
          placeholder={`Search ${meta.label.toLowerCase()}…`}
          value={search}
          onChange={(e) => withReset(setSearch)(e.target.value)}
          className="md:w-72"
          aria-label="Search"
        />
        <div className="grid grid-cols-2 gap-3 md:flex">
          <Select
            aria-label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => withReset(setStatus)(e.target.value as StatusFilter)}
            className={isCategory ? '' : 'col-span-2'}
          />
          {isCategory && (
            <Select
              aria-label="Category level"
              placeholder="All categories"
              value={parentFilter}
              onChange={(e) => withReset(setParentFilter)(e.target.value)}
              options={[
                { value: 'root', label: 'Main categories only' },
                ...mainCategories.items.map((c) => ({ value: String(c.id), label: `In ${c.name}` })),
              ]}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <ExportButton path={`/masters/${meta.key}/export`} params={{ search: debouncedSearch || undefined, status, parentId }} />
          <Button variant="primary" icon={IconPlus} onClick={() => setEditing(null)}>
            Add {meta.singular}
          </Button>
        </div>
      </div>

      <Card bodyClassName="p-0">
        {list.error ? (
          <EmptyState
            title="Couldn't load the list"
            description={list.error}
            action={<Button onClick={list.reload}>Try again</Button>}
          />
        ) : (
          <>
            <DataTable
              startIndex={(page - 1) * PAGE_SIZE + 1}
              columns={columns}
              rows={list.items}
              rowKey={(r) => r.id}
              loading={list.loading}
              emptyTitle={debouncedSearch ? 'No matches' : `No ${meta.label.toLowerCase()} yet`}
              emptyDescription={debouncedSearch ? 'Try a different search.' : `Add your first ${meta.singular}.`}
              onRowClick={setEditing}
            />
            {list.total > PAGE_SIZE && (
              <Pagination page={page} pageSize={PAGE_SIZE} total={list.total} onPageChange={setPage} />
            )}
          </>
        )}
      </Card>

      {editing !== undefined && (
        <MasterFormModal
          key={editing?.id ?? 'new'}
          meta={meta}
          row={editing}
          parents={mainCategories.items}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            refreshAll()
          }}
          onDelete={setDeleting}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${meta.singular}?`}
        message={`"${deleting?.name}" will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
