import { IconArrowLeft, IconBan, IconCash, IconFileTypePdf, IconNeedleThread, IconPencil, IconPlus, IconPrinter, IconProgress, IconReportMoney, IconTruckDelivery } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { ReceiptModal } from '@/features/sales/components/ReceiptModal'
import { fetchFile, printText } from '@/features/sales/print/printing'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import { useToast } from '@/components/ui/toast-context'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { jobsApi } from '../api/jobs.api'
import { DeliverModal, StageModal } from '../components/JobActionModals'
import { JobGarmentsCard } from '../components/JobGarmentsCard'
import { AddCostModal } from '../components/AddCostModal'
import { AssignWorkersModal } from '../components/AssignWorkersModal'
import { JobNextStep } from '../components/JobNextStep'
import { MoreMenu } from '@/components/ui/MoreMenu'
import type { JobCostEntry } from '../types'
import { AddItemsModal } from '../components/AddItemsModal'
import { JobCostsCard } from '../components/JobCostsCard'
import { JobItemsCard } from '../components/JobItemsCard'
import { SalesReturnModal } from '@/features/sales/components/SalesReturnModal'
import { JobMoneyCard } from '../components/JobMoneyCard'
import { dueText, isOpen, stages, statusLabels, statusTones } from '../jobUtils'
import { BookNoChip } from '@/features/sales/components/BookNoChip'
import { jobBillText, jobCostSheetText, tailorSlipText } from '../print/jobText'

// /jobs/:id — one stitching job: stage, garments, materials, money, costing, history.
export function JobViewPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['job', id], () => jobsApi.get(id))
  // From Job work → "Waiting for workers": /jobs/12?assign=1 opens Assign workers straight away.
  const [params] = useSearchParams()
  const [modal, setModal] = useState<'' | 'stage' | 'deliver' | 'receive' | 'cancel' | 'items' | 'return' | 'cost' | 'stock' | 'assign' | 'ready'>(() => (params.get('assign') ? 'assign' : ''))
  const [editCost, setEditCost] = useState<JobCostEntry | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const toast = useToast()
  const { profile, settings } = useBusinessProfile()

  if (q.error) return <Card><EmptyState title="Couldn't open this job" description={q.error} action={<Button onClick={() => navigate('/jobs')}>All jobs</Button>} /></Card>
  const job = q.data ?? q.lastData
  if (!job) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  const open = isOpen(job.status)
  const done = () => { setModal(''); q.reload() }
  const step = stages.indexOf(job.status)
  const print = (slip: boolean | 'cost') => {
    if (!profile || !settings) return toast.error('Settings are still loading — try again')
    const cols = settings['billing.print'].columns
    printText(slip === 'cost' ? jobCostSheetText(job, profile, cols) : slip ? tailorSlipText(job, profile, cols) : jobBillText(job, profile, cols), settings['billing.print'])
  }
  const pdf = async () => {
    setPdfBusy(true)
    try { await fetchFile(`/jobs/${job.id}/pdf`) } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not download') } finally { setPdfBusy(false) }
  }

  return (
    <>
      <button type="button" onClick={() => navigate('/jobs')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Stitching jobs
      </button>
      <PageHeader
        title={job.docNo}
        subtitle={`${job.customerName}${job.customerPhone ? ` · ${job.customerPhone}` : ''} · booked ${formatDate(job.docDate)}`}
        actions={
          <>
            <Button icon={IconPrinter} onClick={() => print(false)} loading={pdfBusy}>Print bill</Button>
            <Button icon={IconNeedleThread} onClick={() => print(true)}>Tailor slip</Button>
            {/* Everything else, in one short list — the main next step is in the card below. */}
            <MoreMenu items={[
              { label: 'Receive money', icon: IconCash, onClick: () => setModal('receive'), hidden: job.status === 'CANCELLED' || job.dueAmount <= 0.004 },
              { label: 'Change stage', icon: IconProgress, onClick: () => setModal('stage'), hidden: !open },
              { label: 'Edit job', icon: IconPencil, onClick: () => navigate(`/jobs/${job.id}/edit`), hidden: !open },
              { label: 'Hand over to customer', icon: IconTruckDelivery, onClick: () => setModal('deliver'), hidden: !open },
              { label: 'Download PDF', icon: IconFileTypePdf, onClick: pdf },
              { label: 'Job cost sheet', icon: IconReportMoney, onClick: () => print('cost') },
              { label: 'New alteration job', icon: IconPlus, onClick: () => navigate(`/jobs/new?customer=${job.customerId}&parent=${job.id}`), hidden: job.status !== 'DELIVERED' },
              { label: 'Cancel job', icon: IconBan, onClick: () => setModal('cancel'), danger: true, hidden: !open },
            ]} />
          </>
        }
      />
      {job.status !== 'CANCELLED' && <BookNoChip bookNo={job.bookNo} docNo={job.docNo} onSave={(v) => jobsApi.setBookNo(job.id, v)} onSaved={q.reload} />}


      <JobNextStep job={job} onAssign={() => setModal('assign')} onReady={() => setModal('ready')} onStage={() => setModal('stage')} onHandOver={() => setModal('deliver')} onReceive={() => setModal('receive')} />

      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-muted">Stage</p><Badge tone={job.overdue ? 'danger' : statusTones[job.status]}>{statusLabels[job.status]}</Badge></div>
          <div>
            <p className="text-xs text-muted">Ready by</p>
            <p className={cn(job.overdue && 'font-medium text-danger')}>{formatDate(job.expectedDate)}{open ? ` · ${dueText(job.expectedDate, true)}` : ''}</p>
          </div>
          <div><p className="text-xs text-muted">Customer</p><Link to={`/customers/${job.customer.id}`} className="text-brand hover:underline">{job.customer.name}</Link></div>
          <div>
            <p className="text-xs text-muted">{job.status === 'DELIVERED' ? 'Handed over' : 'Booked by'}</p>
            {job.status === 'DELIVERED' && job.deliveredAt ? formatDate(job.deliveredAt) : job.createdBy}
          </div>
          {job.parentJob && <div className="col-span-2">Alteration of <Link to={`/jobs/${job.parentJob.id}`} className="text-brand hover:underline">{job.parentJob.docNo}</Link></div>}
          {job.alterations.length > 0 && (
            <div className="col-span-2">Alterations: {job.alterations.map((a) => <Link key={a.id} to={`/jobs/${a.id}`} className="mr-2 text-brand hover:underline">{a.docNo}</Link>)}</div>
          )}
          {job.notes && <div className="col-span-2 sm:col-span-4"><p className="text-xs text-muted">Note on bill</p>{job.notes}</div>}
          {job.internalNotes && <div className="col-span-2 sm:col-span-4"><p className="text-xs text-muted">Internal note</p>{job.internalNotes}</div>}
          {job.status === 'CANCELLED' && <div className="col-span-2 rounded-control bg-page p-3 sm:col-span-4">Cancelled — {job.cancelReason}</div>}
        </div>
        {open && (
          <ol className="mt-4 grid grid-cols-5 gap-1" aria-label="Stages">
            {stages.map((s, i) => (
              <li key={s} className="flex flex-col gap-1">
                <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-brand' : 'bg-line')} />
                <span className={cn('truncate text-[11px]', i === step ? 'font-medium text-brand' : 'text-muted')}>{statusLabels[s].split(' ')[0]}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <JobGarmentsCard job={job} onChanged={q.reload} />
          <JobItemsCard job={job} open={open} onAdd={() => setModal('items')} onReturn={() => setModal('return')} onChanged={q.reload} />
          <JobCostsCard job={job} onAddCost={() => { setEditCost(null); setModal('cost') }} onEditCost={(e) => { setEditCost(e); setModal('cost') }} onAssign={() => setModal('assign')} onUseStock={() => setModal('stock')} onChanged={q.reload} />
          {job.costs.length > 0 && (
            <Card title="Extra charges on the bill" className="mb-5">
              <ul className="flex flex-col gap-1.5 text-sm">
                {job.costs.map((c) => (
                  <li key={c.id} className="flex justify-between gap-3">
                    <span>{c.kind}{c.description ? ` · ${c.description}` : ''}</span>
                    <span className="font-medium">₹{Number(c.charge).toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title="History">
            <ul className="flex flex-col gap-2 text-sm">
              {job.logs.map((l) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-x-3">
                  <span>{l.fromStatus ? `${statusLabels[l.fromStatus]} → ` : ''}<span className="font-medium">{statusLabels[l.toStatus]}</span>{l.note ? ` · ${l.note}` : ''}</span>
                  <span className="text-xs text-muted">{new Date(l.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} · {l.by}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <JobMoneyCard job={job} />
      </div>

      {modal === 'items' && <AddItemsModal job={job} onClose={() => setModal('')} onDone={done} />}
      {modal === 'stock' && <AddItemsModal job={job} usedOnly onClose={() => setModal('')} onDone={done} />}
      {modal === 'cost' && <AddCostModal key={editCost?.id ?? 'new'} job={job} entry={editCost} onClose={() => setModal('')} onDone={done} />}
      {modal === 'assign' && <AssignWorkersModal job={job} onClose={() => setModal('')} onDone={done} />}
      {modal === 'return' && (
        <SalesReturnModal
          source={{
            kind: 'JOB', id: job.id, docNo: job.docNo, customerId: job.customerId, customerName: job.customerName, dueAmount: job.dueAmount,
            lines: job.materials.filter((m) => !m.included).map((m) => ({ id: m.id, description: m.description, qty: m.qty, returnedQty: m.returnedQty, amount: m.amount, unit: m.variant.product.unit.code, sku: m.variant.sku })),
          }}
          onClose={() => setModal('')}
          onSaved={done}
        />
      )}
      {modal === 'stage' && <StageModal job={job} onClose={() => setModal('')} onDone={done} />}
      {modal === 'ready' && <StageModal job={job} to="READY" onClose={() => setModal('')} onDone={done} />}
      {modal === 'deliver' && <DeliverModal job={job} onClose={() => setModal('')} onDone={done} />}
      {modal === 'receive' && <ReceiptModal customerId={job.customerId} customerName={job.customerName} target={{ kind: 'JOB', id: job.id }} onClose={() => setModal('')} onSaved={done} />}
      {modal === 'cancel' && (
        <CancelDocModal docNo={job.docNo} effect="Shop materials go back into stock. Money paid stays as the customer's advance — cancel that receipt too if you gave it back." onCancel={(r) => jobsApi.cancel(job.id, r)} onClose={() => setModal('')} onDone={done} />
      )}
    </>
  )
}
