import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { staffApi } from '../api/staff.api'
import type { Staff, StaffDept } from '../types'
import { StaffWorkSection, type WorkForm } from './StaffWorkSection'

type Props = { staff: Staff | null; onClose: () => void; onSaved: () => void }

const roles = ['Sales staff', 'Tailor', 'Cutting master', 'Embroidery', 'Hand work', 'Helper', 'Teacher', 'Accountant']
const toRates = (r: Record<number, string>) => Object.entries(r).filter(([, v]) => v.trim() !== '').map(([id, v]) => [Number(id), Number(v) || 0] as const)

// Add / edit anyone who works here — sales staff, tailors, cutting master, teachers … — with how they are paid.
// Mount with a key per staff member.
export function StaffFormModal({ staff, onClose, onSaved }: Props) {
  const toast = useToast()
  const [f, setF] = useState({
    name: staff?.name ?? '',
    phone: staff?.phone ?? '',
    address: staff?.address ?? '',
    role: staff?.role ?? '',
    dept: (staff?.dept ?? 'SHOP') as StaffDept,
    salary: staff ? String(Number(staff.salary)) : '',
    joinDate: staff?.joinDate?.slice(0, 10) ?? '',
    notes: staff?.notes ?? '',
    isActive: staff?.isActive ?? true,
  })
  const w = staff?.worker
  const [work, setWork] = useState<WorkForm>(() => ({
    on: !!w?.isActive,
    pay: !w ? 'PIECE' : w.payType === 'SALARY' ? 'SALARY' : Number(staff?.salary) > 0 ? 'BOTH' : 'PIECE',
    stitches: w ? w.stitches : true,
    works: Object.fromEntries((w?.works ?? []).map((r) => [r.categoryId, Number(r.rate) ? String(Number(r.rate)) : ''])),
    rates: Object.fromEntries((w?.rates ?? []).map((r) => [r.garmentTypeId, String(Number(r.rate))])),
    openingBalance: w ? String(Number(w.openingBalance)) : '',
  }))
  const pieceOnly = work.on && work.pay === 'PIECE'
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setError('') }

  const save = async () => {
    if (!f.name.trim()) return setError('Enter the name')
    if (!f.role.trim()) return setError('Enter their role (Sales staff, Tailor …)')
    if (work.on && !work.stitches && !Object.keys(work.works).length) return setError('Tick the work they do (Stitching, Cutting …)')
    if (!pieceOnly && !(Number(f.salary) > 0)) return setError('Enter the monthly salary')
    setSaving(true)
    try {
      const perPiece = work.pay !== 'SALARY'
      const body = {
        ...f, salary: pieceOnly ? 0 : Number(f.salary) || 0, joinDate: f.joinDate || null,
        work: work.on ? {
          payType: perPiece ? ('PIECE' as const) : ('SALARY' as const),
          openingBalance: perPiece ? Number(work.openingBalance) || 0 : 0,
          stitches: work.stitches,
          rates: work.stitches && perPiece ? toRates(work.rates).map(([garmentTypeId, rate]) => ({ garmentTypeId, rate })) : [],
          works: Object.keys(work.works).map((id) => ({ categoryId: Number(id), rate: perPiece ? Number(work.works[Number(id)]) || 0 : 0 })),
        } : null,
      }
      const saved = staff ? await staffApi.update(staff.id, body) : await staffApi.create(body)
      toast.success(staff ? `${saved.name} updated` : `${saved.code} ${saved.name} added`)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!staff) return
    setSaving(true)
    try {
      await staffApi.remove(staff.id)
      toast.success(`${staff.name} deleted`)
      onSaved()
    } catch (err) {
      setConfirmDelete(false)
      setError(err instanceof ApiError ? err.message : 'Could not delete')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={staff ? `Edit ${staff.name}` : 'Add staff'}
      description={staff ? staff.code : undefined}
      footer={<>{staff && <Button variant="danger" onClick={() => setConfirmDelete(true)} className="sm:mr-auto">Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>{staff ? 'Save changes' : 'Add staff'}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Name" required value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        <Input label="Phone" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        <div>
          <Input label="Role" required list="staff-roles" value={f.role} onChange={(e) => set('role', e.target.value)} placeholder="Sales staff, Tailor, Teacher …" />
          <datalist id="staff-roles">{roles.map((r) => <option key={r} value={r} />)}</datalist>
        </div>
        <Select
          label="Works in"
          value={f.dept}
          onChange={(e) => set('dept', e.target.value as StaffDept)}
          options={[{ value: 'WORKSHOP', label: 'Workshop (stitching side)' }, { value: 'SHOP', label: 'Shop (sales / office)' }]}
          hint="Salary is a shop (indirect) expense either way — only per-piece pay is a direct cost"
        />
        <Input label="Joined on" type="date" value={f.joinDate} onChange={(e) => set('joinDate', e.target.value)} />
        <Textarea label="Address" rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} className="sm:col-span-2" />
        <Textarea label="Notes" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} className="sm:col-span-2" placeholder="ID proof, bank account, emergency contact …" />
      </div>
      <StaffWorkSection work={work} onChange={(v) => { setWork(v); setError(''); if (v.on && !work.on) setF((x) => ({ ...x, dept: 'WORKSHOP' })) }} hasHistory={!!w} />
      {!pieceOnly && <Input label={work.on && work.pay === 'BOTH' ? 'Monthly salary ₹ (besides per-piece pay)' : 'Monthly salary ₹'} required type="number" inputMode="decimal" min={0} value={f.salary} onChange={(e) => set('salary', e.target.value)} hint="Paid from Monthly salary, with a payslip" className="mt-4 sm:w-80" />}
      <div className="mt-4"><Switch label="Active" hint="Inactive staff can't be paid and are hidden from the list" checked={f.isActive} onChange={(v) => set('isActive', v)} /></div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <ConfirmDialog open={confirmDelete} title={`Delete ${staff?.name ?? ''}?`} message="Only possible while no salary was paid to them. Otherwise make them Inactive." confirmLabel="Delete" danger loading={saving} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
    </Modal>
  )
}
