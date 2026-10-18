import { IconPlus, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { enrolmentStatusLabels, trainingApi } from '../api/training.api'
import { BatchList } from '../components/BatchList'
import { CourseList } from '../components/CourseList'
import { FeeReceiptsList, FeesPendingList } from '../components/FeeLists'
import { StudentFormModal } from '../components/StudentModals'
import type { Student } from '../types'

const tabs = [
  { key: 'students', label: 'Students' },
  { key: 'pending', label: 'Fees pending' },
  { key: 'fees', label: 'Fee receipts' },
  { key: 'batches', label: 'Batches' },
  { key: 'courses', label: 'Courses' },
] as const
type Tab = (typeof tabs)[number]['key']

const columns: Column<Student>[] = [
  { key: 'name', header: 'Student', mobile: 'title', render: (s) => <span className="block min-w-0"><span className="block font-medium text-ink">{s.name}</span><span className="block text-xs text-muted">{s.code}{s.phone ? ` · ${s.phone}` : ''}</span></span> },
  { key: 'course', header: 'Course', mobile: 'subtitle', render: (s) => s.enrolments.map((e) => `${e.batch.course.name}${e.status !== 'STUDYING' ? ` (${enrolmentStatusLabels[e.status]})` : ''}`).join(', ') || '—' },
  { key: 'fee', header: 'Fee', align: 'right', mobile: 'hidden', render: (s) => formatINR(s.fee ?? 0) },
  { key: 'paid', header: 'Paid', align: 'right', render: (s) => formatINR(s.paid ?? 0) },
  { key: 'due', header: 'Due', align: 'right', mobile: 'badge', render: (s) => <span className={s.due ? 'font-medium text-warn' : 'text-success'}>{s.due ? formatINR(s.due) : 'Paid'}</span> },
]

// /training — tailoring classes: students, fees, batches, courses.
export function TrainingPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (tabs.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'students') as Tab
  const batchId = Number(params.get('batch')) || undefined
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('STUDYING')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const debounced = useDebounce(search.trim())
  const filters = { search: debounced || undefined, status: status || undefined, batchId }
  const q = useApiQuery(['students', filters, page, tab], () => (tab === 'students' ? trainingApi.students({ ...filters, page }) : Promise.resolve(null)))
  const batches = useApiQuery('batches-all', () => trainingApi.batches())
  const batch = batches.data?.find((b) => b.id === batchId)

  return (
    <>
      <PageHeader title="Training" subtitle="Tailoring classes — students, batches and fees." actions={<Button variant="primary" icon={IconPlus} onClick={() => setAdding(true)}>New student</Button>} />
      <div className="mb-4"><Tabs tabs={[...tabs]} active={tab} onChange={(t) => { setParams(t === 'students' ? {} : { tab: t }); setPage(1) }} /></div>
      {tab === 'pending' ? <FeesPendingList /> : tab === 'fees' ? <FeeReceiptsList /> : tab === 'batches' ? <BatchList /> : tab === 'courses' ? <CourseList /> : (
        <>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_11rem] md:w-[34rem]">
              <Input icon={IconSearch} aria-label="Search students" placeholder="Name, code or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
              <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} options={[{ value: 'STUDYING', label: 'Studying' }, { value: 'COMPLETED', label: 'Completed' }, { value: 'DROPPED', label: 'Left' }, { value: '', label: 'All students' }]} />
            </div>
            <ExportButton path="/training/students/export" params={filters} />
          </div>
          {batch && (
            <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              Batch: <b className="text-ink">{batch.course.name} · {batch.name}</b>
              <button type="button" className="text-brand hover:underline" onClick={() => setParams({})}>Show all</button>
            </p>
          )}
          <Card bodyClassName="p-0">
            {q.error ? <EmptyState title="Couldn't load students" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} /> : (
              <>
                <DataTable startIndex={(page - 1) * 20 + 1} columns={columns} rows={q.data?.items ?? []} rowKey={(s) => s.id} loading={q.loading} emptyTitle="No students" emptyDescription="Add courses and batches first, then the students who join." onRowClick={(s) => navigate(`/training/students/${s.id}`)} />
                {(q.data?.total ?? 0) > 20 && <Pagination page={page} pageSize={20} total={q.data!.total} onPageChange={setPage} />}
              </>
            )}
          </Card>
        </>
      )}
      {adding && <StudentFormModal student={null} onClose={() => setAdding(false)} onSaved={(s) => { setAdding(false); if (s) navigate(`/training/students/${s.id}`) }} />}
    </>
  )
}
