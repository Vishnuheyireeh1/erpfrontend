import { IconCash, IconCircleCheck, IconPhone, IconProgressCheck, IconTruckDelivery, IconUsers } from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import type { Job } from '../types'

type Props = { job: Job; onAssign: () => void; onReady: () => void; onStage: () => void; onHandOver: () => void; onReceive: () => void }
type Step = { tone: 'brand' | 'warn' | 'success' | 'muted'; icon: Icon; title: string; text: string; action?: { label: string; icon: Icon; onClick: () => void }; extra?: { label: string; onClick: () => void } }

const tones = {
  brand: 'border-brand/40 bg-brand-tint text-brand',
  warn: 'border-warn/40 bg-warn-tint text-warn',
  success: 'border-success/40 bg-success-tint text-success',
  muted: 'border-line bg-page text-ink-soft',
}

// Top of a job page: what to do NOW, in plain words, with one button for it.
// Booked → give it to a tailor → stitching → Ready (call the customer) → hand over & collect the balance → done.
export function JobNextStep({ job, onAssign, onReady, onStage, onHandOver, onReceive }: Props) {
  const due = job.dueAmount
  const noTailor = job.items.filter((i) => !i.tailorId)
  const tailors = [...new Set(job.items.map((i) => i.tailor?.name).filter(Boolean))].join(', ')
  const phone = job.customerPhone ? ` (${job.customerPhone})` : ''

  let step: Step | null = null
  if (job.status === 'CANCELLED') step = null
  else if (job.status === 'DELIVERED') {
    step = due > 0.004
      ? { tone: 'warn', icon: IconCash, title: `Handed over — ${formatINR(due)} still to collect`, text: `Collect the balance from ${job.customerName}.`, action: { label: `Receive ${formatINR(due)}`, icon: IconCash, onClick: onReceive } }
      : { tone: 'success', icon: IconCircleCheck, title: 'All done', text: `Handed over and fully paid. Nothing more to do.` }
  } else if (job.status === 'READY') {
    step = { tone: 'success', icon: IconPhone, title: 'Ready — call the customer', text: `Call ${job.customerName}${phone} to come and collect.${due > 0.004 ? ` Collect ${formatINR(due)} when handing over.` : ' Fully paid.'}`,
      action: { label: due > 0.004 ? `Hand over & collect ${formatINR(due)}` : 'Hand over to customer', icon: IconTruckDelivery, onClick: onHandOver } }
  } else if (noTailor.length) {
    step = { tone: 'brand', icon: IconUsers, title: 'Next: give it to a tailor', text: `${noTailor.map((i) => i.description).join(', ')} — no tailor yet. Choose who stitches it (and any embroidery / cutting work).`,
      action: { label: 'Assign workers', icon: IconUsers, onClick: onAssign } }
  } else {
    step = { tone: 'brand', icon: IconProgressCheck, title: `In work with ${tailors}`, text: 'When the stitching is finished, mark it Ready — the workers\' pay is counted then.',
      action: { label: 'Mark Ready', icon: IconProgressCheck, onClick: onReady }, extra: { label: 'Other stage (cutting, trial …)', onClick: onStage } }
  }
  if (!step) return null
  const S = step

  return (
    <div className={cn('mb-5 flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-center', tones[S.tone])}>
      <S.icon size={28} className="shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{S.title}</p>
        <p className="text-sm text-ink-soft">{S.text}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        {S.extra && <button type="button" onClick={S.extra.onClick} className="text-sm font-medium text-ink-soft hover:underline">{S.extra.label}</button>}
        {S.action && <Button variant="primary" icon={S.action.icon} onClick={S.action.onClick} className="h-11">{S.action.label}</Button>}
      </div>
    </div>
  )
}
