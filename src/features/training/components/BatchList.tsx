import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { staffApi } from '@/features/staff/api/staff.api'
import { ApiError } from '@/lib/api'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { trainingApi } from '../api/training.api'
import type { Batch } from '../types'

function BatchModal({ batch, onClose, onSaved }: { batch: Batch | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const courses = useApiQuery('courses', () => trainingApi.courses())
  const staff = useApiQuery('staff-options', () => staffApi.options())
  const [f, setF] = useState({
    courseId: batch ? String(batch.courseId) : '', name: batch?.name ?? '', timing: batch?.timing ?? '', startDate: batch?.startDate.slice(0, 10) ?? todayISO(),
    teacherId: batch?.teacherId ? String(batch.teacherId) : '', isActive: batch?.isActive ?? true, notes: batch?.notes ?? '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setError('') }
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true)
    try { await fn(); toast.success(msg); onSaved() } catch (err) { setConfirm(false); setError(err instanceof ApiError ? err.message : 'Could not save'); setBusy(false) }
  }
  const save = () => {
    if (!f.courseId) return setError('Choose the course')
    if (!f.name.trim()) return setError('Enter the batch name')
    run(() => trainingApi.saveBatch(batch?.id ?? null, { ...f, courseId: Number(f.courseId), teacherId: f.teacherId ? Number(f.teacherId) : null }), batch ? 'Batch updated' : 'Batch added')
  }
  const courseOptions = (courses.data ?? []).filter((c) => c.isActive || c.id === batch?.courseId)

  return (
    <Modal open onClose={onClose} title={batch ? `Edit ${batch.name}` : 'Add batch'}
      footer={<>{batch && <Button variant="danger" onClick={() => setConfirm(true)} className="sm:mr-auto">Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Course" required value={f.courseId} onChange={(e) => set('courseId', e.target.value)} options={[{ value: '', label: 'Choose…' }, ...courseOptions.map((c) => ({ value: String(c.id), label: c.name }))]} className="sm:col-span-2" />
        <Input label="Batch name" required value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Morning · Oct 2026" />
        <Input label="Timing" value={f.timing} onChange={(e) => set('timing', e.target.value)} placeholder="10 AM – 12 PM, Mon–Fri" />
        <Input label="Starts on" type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
        <Select label="Teacher" value={f.teacherId} onChange={(e) => set('teacherId', e.target.value)} options={[{ value: '', label: '—' }, ...(staff.data ?? []).map((s) => ({ value: String(s.id), label: `${s.name} · ${s.role}` }))]} hint="From Staff & salary" />
        <Textarea label="Notes" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} className="sm:col-span-2" />
      </div>
      <div className="mt-4"><Switch label="Running" hint="Turn off when the batch has finished" checked={f.isActive} onChange={(v) => set('isActive', v)} /></div>
      {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <ConfirmDialog open={confirm} title={`Delete ${batch?.name ?? ''}?`} message="Only possible while no student has joined it." confirmLabel="Delete" danger loading={busy} onConfirm={() => run(() => trainingApi.removeBatch(batch!.id), 'Batch deleted')} onCancel={() => setConfirm(false)} />
    </Modal>
  )
}

// Training → "Batches" tab: running and finished batches with students and fees still due.
export function BatchList() {
  const navigate = useNavigate()
  const q = useApiQuery('batches-all', () => trainingApi.batches())
  const [editing, setEditing] = useState<Batch | 'new' | null>(null)
  const columns: Column<Batch>[] = [
    { key: 'name', header: 'Batch', mobile: 'title', render: (b) => <span className="block min-w-0"><span className="block font-medium text-ink">{b.name}</span><span className="block text-xs text-muted">{b.course.name}</span></span> },
    { key: 'timing', header: 'Timing', mobile: 'subtitle', render: (b) => `${b.timing ?? '—'} · from ${formatDate(b.startDate)}` },
    { key: 'teacher', header: 'Teacher', render: (b) => b.teacher?.name ?? '—' },
    { key: 'students', header: 'Students', align: 'right', render: (b) => <button type="button" className="text-brand hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/training?batch=${b.id}`) }}>{b.students}</button> },
    { key: 'due', header: 'Fees due', align: 'right', render: (b) => <span className={b.feesDue ? 'font-medium text-warn' : 'text-muted'}>{formatINR(b.feesDue)}</span> },
    { key: 'status', header: '', mobile: 'badge', render: (b) => (b.isActive ? <Badge tone="success">Running</Badge> : <Badge>Finished</Badge>) },
  ]
  return (
    <>
      <div className="mb-3 flex justify-end"><Button variant="primary" icon={IconPlus} onClick={() => setEditing('new')}>Add batch</Button></div>
      <Card bodyClassName="p-0">
        <DataTable columns={columns} rows={q.data ?? []} rowKey={(b) => b.id} loading={q.loading} emptyTitle="No batches yet" emptyDescription="Add a course first, then a batch with its timing and teacher." onRowClick={(b) => setEditing(b)} />
      </Card>
      {editing && <BatchModal key={editing === 'new' ? 'new' : editing.id} batch={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); q.reload() }} />}
    </>
  )
}
