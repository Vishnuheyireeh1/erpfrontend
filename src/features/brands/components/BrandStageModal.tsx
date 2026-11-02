import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { brandOrderApi } from '../api/brandOrder.api'
import { stageLabel, type BrandOrder } from '../types'

type Props = { order: BrandOrder; onClose: () => void; onDone: () => void }

// Order page → Change stage: tick pieces → Mark ready (the tailor's per-piece pay is earned today) or Back in work.
export function BrandStageModal({ order, onClose, onDone }: Props) {
  const toast = useToast()
  const left = order.items.filter((i) => i.stage !== 'DELIVERED')
  const [picked, setPicked] = useState<number[]>(() => left.filter((i) => i.stage === 'IN_WORK').map((i) => i.id))
  const [busy, setBusy] = useState(false)
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const save = async (stage: 'READY' | 'IN_WORK') => {
    const ids = left.filter((i) => picked.includes(i.id) && i.stage !== stage).map((i) => i.id)
    if (!ids.length) return toast.error(stage === 'READY' ? 'Tick pieces that are still in work' : 'Tick pieces that are ready')
    setBusy(true)
    try {
      await brandOrderApi.stage(order.id, ids, stage)
      toast.success(stage === 'READY' ? 'Marked ready' : 'Back in work')
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Change stage — ${order.docNo}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={() => save('IN_WORK')}>Back in work</Button><Button variant="primary" loading={busy} onClick={() => save('READY')}>Mark ready</Button></>}>
      <ul className="flex flex-col gap-2">
        {left.map((i) => (
          <li key={i.id}>
            <label className={cn('flex cursor-pointer items-center gap-3 rounded-control border p-3 text-sm', picked.includes(i.id) ? 'border-brand bg-brand-tint/40' : 'border-line')}>
              <input type="checkbox" checked={picked.includes(i.id)} onChange={() => toggle(i.id)} className="size-5 accent-brand" />
              <span className="min-w-0 flex-1 font-medium text-ink">{i.qty} × {i.description}{i.endCustomer && <span className="font-normal text-ink-soft"> · for {i.endCustomer}</span>}</span>
              <span className={i.stage === 'READY' ? 'text-xs text-success' : 'text-xs text-warn'}>{stageLabel[i.stage]}</span>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
