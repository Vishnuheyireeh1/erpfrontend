import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { trainingApi } from '../api/training.api'
import type { Course } from '../types'

function CourseModal({ course, onClose, onSaved }: { course: Course | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({ name: course?.name ?? '', months: String(course?.months ?? 3), fee: course ? String(Number(course.fee)) : '', description: course?.description ?? '', isActive: course?.isActive ?? true })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setError('') }
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try { await fn(); toast.success(msg); onSaved() } catch (err) { setConfirm(false); setError(err instanceof ApiError ? err.message : 'Could not save'); setBusy(false) }
  }
  const save = () => (!f.name.trim() ? setError('Enter the course name') : run(() => trainingApi.saveCourse(course?.id ?? null, { ...f, months: Number(f.months) || 1, fee: Number(f.fee) || 0 }), course ? 'Course updated' : 'Course added'))

  return (
    <Modal open onClose={onClose} title={course ? `Edit ${course.name}` : 'Add course'}
      footer={<>{course && <Button variant="danger" onClick={() => setConfirm(true)} className="sm:mr-auto">Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Course name" required value={f.name} onChange={(e) => set('name', e.target.value)} className="sm:col-span-2" placeholder="Basic tailoring, Fashion designing …" autoFocus />
        <Input label="Duration (months)" type="number" inputMode="numeric" min={1} value={f.months} onChange={(e) => set('months', e.target.value)} />
        <Input label="Course fee ₹" type="number" inputMode="decimal" min={0} value={f.fee} onChange={(e) => set('fee', e.target.value)} hint="Can be changed for each student (discount)" />
        <Textarea label="What is taught" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} className="sm:col-span-2" />
      </div>
      <div className="mt-4"><Switch label="Active" hint="Inactive courses are hidden when adding batches" checked={f.isActive} onChange={(v) => set('isActive', v)} /></div>
      {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <ConfirmDialog open={confirm} title={`Delete ${course?.name ?? ''}?`} message="Only possible while the course has no batches." confirmLabel="Delete" danger loading={busy} onConfirm={() => run(() => trainingApi.removeCourse(course!.id), 'Course deleted')} onCancel={() => setConfirm(false)} />
    </Modal>
  )
}

const columns: Column<Course>[] = [
  { key: 'name', header: 'Course', mobile: 'title', render: (c) => <span className="block min-w-0"><span className="block font-medium text-ink">{c.name}</span>{c.description && <span className="block truncate text-xs text-muted">{c.description}</span>}</span> },
  { key: 'months', header: 'Duration', mobile: 'subtitle', render: (c) => `${c.months} month${c.months > 1 ? 's' : ''}` },
  { key: 'fee', header: 'Fee', align: 'right', render: (c) => formatINR(Number(c.fee)) },
  { key: 'batches', header: 'Batches', align: 'right', render: (c) => c.batchCount },
  { key: 'status', header: '', mobile: 'badge', render: (c) => (!c.isActive ? <Badge>Inactive</Badge> : null) },
]

// Training → "Courses" tab.
export function CourseList() {
  const q = useApiQuery('courses', () => trainingApi.courses())
  const [editing, setEditing] = useState<Course | 'new' | null>(null)
  return (
    <>
      <div className="mb-3 flex justify-end"><Button variant="primary" icon={IconPlus} onClick={() => setEditing('new')}>Add course</Button></div>
      <Card bodyClassName="p-0">
        <DataTable columns={columns} rows={q.data ?? []} rowKey={(c) => c.id} loading={q.loading} emptyTitle="No courses yet" emptyDescription="Add the courses taught, with their usual fee." onRowClick={(c) => setEditing(c)} />
      </Card>
      {editing && <CourseModal key={editing === 'new' ? 'new' : editing.id} course={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); q.reload() }} />}
    </>
  )
}
