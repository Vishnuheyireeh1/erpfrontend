import { IconCash, IconCircleCheck, IconProgressCheck, IconTruckDelivery, IconUsers } from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import type { BrandOrder } from '../types'

type Props = { order: BrandOrder; onAssign: () => void; onStage: () => void; onHandOver: () => void; onReceive: () => void }
type Step = { tone: 'brand' | 'warn' | 'success'; icon: Icon; title: string; text: string; action?: { label: string; icon: Icon; onClick: () => void } }

const tones = {
  brand: 'border-brand/40 bg-brand-tint text-brand',
  warn: 'border-warn/40 bg-warn-tint text-warn',
  success: 'border-success/40 bg-success-tint text-success',
}

// Top of a brand order page: what to do NOW, with one button — like a stitching job.
// Saved → give it to a tailor → stitching → Ready → hand over (makes the delivery bill) → collect the balance → done.
export function BrandNextStep({ order, onAssign, onStage, onHandOver, onReceive }: Props) {
  const left = order.items.filter((i) => i.stage !== 'DELIVERED')
  const noTailor = left.filter((i) => !i.tailorId)
  const inWork = left.filter((i) => i.stage === 'IN_WORK')
  const brand = order.brandName
  let step: Step | null = null
  if (order.status === 'CANCELLED') step = null
  else if (noTailor.length) step = { tone: 'brand', icon: IconUsers, title: 'Next: give it to a tailor', text: `${noTailor.map((i) => i.description).join(', ')} — no tailor yet.`, action: { label: 'Assign workers', icon: IconUsers, onClick: onAssign } }
  else if (inWork.length) step = { tone: 'brand', icon: IconProgressCheck, title: 'Being stitched', text: `${inWork.reduce((s, i) => s + i.qty, 0)} piece(s) in work. Mark them ready when stitched — the tailor's pay is earned that day.`, action: { label: 'Mark ready', icon: IconProgressCheck, onClick: onStage } }
  else if (left.length) step = { tone: 'success', icon: IconTruckDelivery, title: `Ready — hand over to ${brand}`, text: 'Handing over makes the delivery bill.', action: { label: 'Hand over', icon: IconTruckDelivery, onClick: onHandOver } }
  else if (order.balance > 0.004) step = { tone: 'warn', icon: IconCash, title: `Handed over — ${formatINR(order.balance)} still to collect`, text: `Collect the balance from ${brand}.`, action: { label: `Receive ${formatINR(order.balance)}`, icon: IconCash, onClick: onReceive } }
  else step = { tone: 'success', icon: IconCircleCheck, title: 'All done', text: 'Handed over and fully paid.' }
  if (!step) return null
  const S = step
  return (
    <div className={cn('mb-5 flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-center', tones[S.tone])}>
      <S.icon size={28} className="shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{S.title}</p>
        <p className="text-sm text-ink-soft">{S.text}</p>
      </div>
      {S.action && <Button variant="primary" icon={S.action.icon} onClick={S.action.onClick} className="h-11 shrink-0">{S.action.label}</Button>}
    </div>
  )
}
