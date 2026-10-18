import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { enrolmentStatusLabels, trainingApi } from '../api/training.api'
import { emptyEnrol, enrolError, toEnrolBody } from '../enrolDraft'
import type { Enrolment, EnrolmentStatus, Student } from '../types'
import { EnrolFields } from './EnrolFields'

const errBox = (e: string) => e && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{e}</p>

// Add a student (and join a batch in the same step) / edit details. Mount with a key.
export function StudentFormModal({ student, onClose, onSaved }: { student: Student | null; onClose: () => void; onSaved: (s: Student | null) => void }) {
  const toast = useToast()
  const [f, setF] = useState({ name: student?.name ?? '', phone: student?.phone ?? '', guardianPhone: student?.guardianPhone ?? '', address: student?.address ?? '', notes: student?.notes ?? '' })
  const [enrol, setEnrol] = useState(emptyEnrol)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: string) => { setF((x) => ({ ...x, [k]: v })); setError('') }

  const save = async () => {
    if (!f.name.trim()) return setError('Enter the student name')
    const enrolProblem = student ? null : enrolError(enrol)
    if (enrolProblem) return setError(enrolProblem)
    setBusy(true)
    try {
      const s = student ? await trainingApi.updateStudent(student.id, f) : await trainingApi.createStudent({ ...f, enrol: toEnrolBody(enrol) })
      toast.success(student ? 'Student updated' : `${s.code} ${s.name} joined`)
      onSaved(s)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }
  const remove = async () => {
    setBusy(true)
    try { await trainingApi.removeStudent(student!.id); toast.success('Student deleted'); onSaved(null) } catch (err) { setConfirm(false); setError(err instanceof ApiError ? err.message : 'Could not delete'); setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} size="lg" title={student ? `Edit ${student.name}` : 'New student'}
      footer={<>{student && <Button variant="danger" onClick={() => setConfirm(true)} className="sm:mr-auto">Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>{student ? 'Save' : 'Add student'}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Student name" required value={f.name} onChange={(e) => set('name', e.target.value)} className="sm:col-span-2" autoFocus />
        <Input label="Phone" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        <Input label="Parent / guardian phone" inputMode="tel" value={f.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)} />
        <Textarea label="Address" rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} className="sm:col-span-2" />
      </div>
      {!student && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-3 text-sm font-medium text-ink">Joins</p>
          <EnrolFields value={enrol} onChange={(d) => { setEnrol(d); setError('') }} />
        </div>
      )}
      {errBox(error)}
      <ConfirmDialog open={confirm} title={`Delete ${student?.name ?? ''}?`} message="Only possible while the student has not joined any course." confirmLabel="Delete" danger loading={busy} onConfirm={remove} onCancel={() => setConfirm(false)} />
    </Modal>
  )
}

// Join another course / batch.
export function EnrolModal({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [d, setD] = useState(emptyEnrol)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    const problem = enrolError(d)
    if (problem) return setError(problem)
    setBusy(true)
    try { await trainingApi.enrol(student.id, toEnrolBody(d)); toast.success('Joined'); onSaved() } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not save'); setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={`${student.name} joins a course`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Join</Button></>}>
      <EnrolFields value={d} onChange={(x) => { setD(x); setError('') }} excludeBatchIds={student.enrolments.map((e) => e.batchId)} />
      {errBox(error)}
    </Modal>
  )
}

// Change the agreed fee (discount) or mark completed / left.
export function EnrolmentEditModal({ enrolment, onClose, onSaved }: { enrolment: Enrolment; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [fee, setFee] = useState(String(enrolment.fee))
  const [status, setStatus] = useState<EnrolmentStatus>(enrolment.status)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (Number(fee) < enrolment.paid) return setError(`${formatINR(enrolment.paid)} is already paid — the fee can't be less`)
    setBusy(true)
    try { await trainingApi.updateEnrolment(enrolment.id, { fee: Number(fee), status }); toast.success('Saved'); onSaved() } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not save'); setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={enrolment.batch.course.name} description={enrolment.batch.name} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Course fee ₹" type="number" inputMode="decimal" min={0} value={fee} onChange={(e) => { setFee(e.target.value); setError('') }} hint={`Paid ${formatINR(enrolment.paid)}`} />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as EnrolmentStatus)} options={(Object.keys(enrolmentStatusLabels) as EnrolmentStatus[]).map((s) => ({ value: s, label: enrolmentStatusLabels[s] }))} hint={status === 'DROPPED' ? 'Left — the remaining fee is no longer expected' : undefined} />
      </div>
      {errBox(error)}
    </Modal>
  )
}
