import { IconCash, IconEdit, IconPlus, IconPrinter } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { enrolmentStatusLabels, trainingApi } from '../api/training.api'
import { FeeModal } from '../components/FeeModal'
import { EnrolModal, EnrolmentEditModal, StudentFormModal } from '../components/StudentModals'
import { usePrintFee } from '../print/usePrintFee'
import type { Enrolment, FeeReceipt } from '../types'

const tone = { STUDYING: 'info', COMPLETED: 'success', DROPPED: 'neutral' } as const

// /training/students/:id — details, each course with fee / paid / due, receipts (print / cancel).
export function StudentPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const printFee = usePrintFee()
  const q = useApiQuery(['student', id], () => trainingApi.student(id))
  const [modal, setModal] = useState<'edit' | 'enrol' | null>(null)
  const [paying, setPaying] = useState<Enrolment | null>(null)
  const [editingEnrol, setEditingEnrol] = useState<Enrolment | null>(null)
  const [cancelling, setCancelling] = useState<FeeReceipt | null>(null)
  const s = q.data ?? q.lastData
  const done = () => { setModal(null); setPaying(null); setEditingEnrol(null); setCancelling(null); q.reload() }

  if (q.error && !s) return <Card><EmptyState title="Couldn't load" description={q.error} action={<Button onClick={() => navigate('/training')}>Back</Button>} /></Card>
  if (!s) return <div className="flex justify-center py-16"><Spinner /></div>
  const due = s.enrolments.reduce((t, e) => t + e.due, 0)

  return (
    <>
      <PageHeader
        title={s.name}
        subtitle={[s.code, s.phone, s.guardianPhone && `Parent ${s.guardianPhone}`].filter(Boolean).join(' · ')}
        actions={<><Button icon={IconEdit} onClick={() => setModal('edit')}>Edit</Button><Button variant="primary" icon={IconPlus} onClick={() => setModal('enrol')}>Join course</Button></>}
      />
      {(s.address || s.notes) && <p className="mb-4 text-sm text-ink-soft">{[s.address, s.notes].filter(Boolean).join(' · ')}</p>}
      {due > 0 && <p className="mb-4 rounded-control bg-warn-tint px-3 py-2 text-sm font-medium text-warn">Fee due {formatINR(due)}</p>}
      <div className="flex flex-col gap-4">
        {s.enrolments.length === 0 && <Card><EmptyState title="Not in any course" description="Use 'Join course'." /></Card>}
        {s.enrolments.map((e) => (
          <Card
            key={e.id}
            title={`${e.batch.course.name} · ${e.batch.name}`}
            actions={
              <span className="flex flex-wrap items-center gap-2">
                <Badge tone={tone[e.status]}>{enrolmentStatusLabels[e.status]}</Badge>
                <Button size="sm" icon={IconEdit} onClick={() => setEditingEnrol(e)}>Fee / status</Button>
                {e.due > 0 && <Button size="sm" variant="primary" icon={IconCash} onClick={() => setPaying(e)}>Receive fee</Button>}
              </span>
            }
          >
            <div className="mb-3 grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-muted">Fee</p><p className="font-semibold text-ink">{formatINR(e.fee)}</p></div>
              <div><p className="text-muted">Paid</p><p className="font-semibold text-success">{formatINR(e.paid)}</p></div>
              <div><p className="text-muted">Due</p><p className={cn('font-semibold', e.due ? 'text-warn' : 'text-ink')}>{formatINR(e.due)}</p></div>
            </div>
            <p className="mb-2 text-xs text-muted">Joined {formatDate(e.joinedOn)}{e.batch.timing ? ` · ${e.batch.timing}` : ''} · {e.batch.course.months} months</p>
            {(e.receipts ?? []).length > 0 && (
              <ul className="divide-y divide-line rounded-card border border-line">
                {(e.receipts ?? []).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className={cn('block font-medium', r.status === 'CANCELLED' ? 'text-muted line-through' : 'text-ink')}>{r.docNo}</span>
                      <span className="block text-xs text-muted">{formatDate(r.docDate)} · {paymentModeLabels[r.mode]}{r.status === 'CANCELLED' ? ` · cancelled: ${r.cancelReason}` : ''}</span>
                    </span>
                    <span className="font-medium text-ink">{formatINR(Number(r.amount))}</span>
                    <button type="button" className="rounded-control p-1 text-muted hover:text-brand" aria-label={`Print ${r.docNo}`} onClick={() => printFee(r.id)}><IconPrinter size={18} /></button>
                    {r.status === 'POSTED' && <button type="button" className="text-xs text-muted hover:text-danger" onClick={() => setCancelling(r)}>Cancel</button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
      {modal === 'edit' && <StudentFormModal student={s} onClose={() => setModal(null)} onSaved={(x) => (x ? done() : navigate('/training'))} />}
      {modal === 'enrol' && <EnrolModal student={s} onClose={() => setModal(null)} onSaved={done} />}
      {paying && <FeeModal enrolmentId={paying.id} title={`${s.name} · ${paying.batch.course.name}`} due={paying.due} onClose={() => setPaying(null)} onSaved={done} />}
      {editingEnrol && <EnrolmentEditModal enrolment={editingEnrol} onClose={() => setEditingEnrol(null)} onSaved={done} />}
      {cancelling && <CancelDocModal docNo={cancelling.docNo} effect="The amount goes back to the balance due and comes off cash / bank." onCancel={(r) => trainingApi.cancelReceipt(cancelling.id, r)} onClose={() => setCancelling(null)} onDone={done} />}
    </>
  )
}
