import { IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { systemApi, type Activity } from '../api/system.api'

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const label = (entity: string) => entity.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

const columns: Column<Activity>[] = [
  { key: 'at', header: 'When', mobile: 'subtitle', render: (a) => <span className="whitespace-nowrap text-muted">{when(a.at)}</span> },
  { key: 'summary', header: 'What happened', mobile: 'title', render: (a) => <span className="text-ink">{a.summary}</span> },
  { key: 'entity', header: 'Type', mobile: 'hidden', render: (a) => label(a.entity) },
  { key: 'actor', header: 'By', mobile: 'badge', render: (a) => <span className="text-xs text-muted">{a.actor}</span> },
]

// /settings/activity — every saved change, newest first (the audit trail). Read-only.
export function ActivityPage() {
  const [search, setSearch] = useState('')
  const [entity, setEntity] = useState('')
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' })
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search.trim())
  const filters = { search: debounced || undefined, entity: entity || undefined, from: range.from || undefined, to: range.to || undefined }
  const q = useApiQuery(['activity', filters, page], () => systemApi.activity({ ...filters, page }))
  const entities = (q.data ?? q.lastData)?.entities ?? []

  return (
    <>
      <PageHeader title="Activity log" subtitle="Every bill, payment, cancel and setting change — who did it and when. Nothing here can be edited." actions={<ExportButton path="/system/activity/export" params={filters} />} />
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] md:w-[40rem]">
        <Input icon={IconSearch} aria-label="Search activity" placeholder="Bill number, name, amount …" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <Select aria-label="Type" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1) }} options={[{ value: '', label: 'All types' }, ...entities.map((e) => ({ value: e, label: label(e) }))]} />
      </div>
      <DateRange value={range} onChange={(r) => { setRange(r); setPage(1) }} className="mb-4" />
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load the activity log" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <>
            <DataTable startIndex={(page - 1) * 50 + 1} columns={columns} rows={q.data?.items ?? []} rowKey={(a) => a.id} loading={q.loading} emptyTitle="Nothing found" />
            {(q.data?.total ?? 0) > 50 && <Pagination page={page} pageSize={50} total={q.data!.total} onPageChange={setPage} />}
          </>
        )}
      </Card>
    </>
  )
}
