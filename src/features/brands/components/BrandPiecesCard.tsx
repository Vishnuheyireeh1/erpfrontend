import { IconCheck, IconPackage, IconRotate, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/toast-context'
import { orderedValues } from '@/features/workshop/api/workshop.api'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { brandOrderApi } from '../api/brandOrder.api'
import { stageLabel, stageTone, type BrandOrder, type BrandPiece } from '../types'
import { BrandTailorModal } from './BrandTailorModal'

type Props = { order: BrandOrder; onChanged: () => void; onAddItems: (piece: BrandPiece) => void }

// Pieces of a brand order: tick the ones stitched → "Mark ready" (tailor's per-piece pay is earned that day).
export function BrandPiecesCard({ order, onChanged, onAddItems }: Props) {
  const toast = useToast()
  const [picked, setPicked] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [tailorFor, setTailorFor] = useState<BrandPiece | null>(null)
  const open = order.status === 'OPEN'
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const chosen = order.items.filter((i) => picked.includes(i.id))

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(ok)
      setPicked([])
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  const stage = (s: 'READY' | 'IN_WORK') => {
    const ids = chosen.filter((i) => i.stage !== 'DELIVERED' && i.stage !== s).map((i) => i.id)
    if (!ids.length) return toast.error(s === 'READY' ? 'Tick pieces that are still in work' : 'Tick pieces that are ready')
    run(() => brandOrderApi.stage(order.id, ids, s), s === 'READY' ? 'Marked ready' : 'Back in work')
  }
  const removeMaterial = (id: number) => run(() => brandOrderApi.removeMaterial(order.id, id), 'Item taken off — back in stock')

  const actions = open && (
    <div className="flex flex-wrap gap-2">
      <Button icon={IconCheck} variant="primary" disabled={!picked.length} loading={busy} onClick={() => stage('READY')}>Mark ready{picked.length ? ` (${picked.length})` : ''}</Button>
      <Button icon={IconRotate} disabled={!picked.length || busy} onClick={() => stage('IN_WORK')}>Back in work</Button>
    </div>
  )

  return (
    <Card title={`Pieces (${order.pieces})`} actions={actions} className="mb-5">
      <ul className="flex flex-col gap-3">
        {order.items.map((i) => {
          const values = orderedValues(i.measurements, i.garmentType.fields)
          const mats = order.materials.filter((m) => m.itemId === i.id)
          const canTick = open && i.stage !== 'DELIVERED'
          return (
            <li key={i.id} className={cn('rounded-card border p-3', picked.includes(i.id) ? 'border-brand bg-brand-tint/40' : 'border-line')}>
              <div className="flex items-start gap-3">
                {canTick && <input type="checkbox" aria-label={`Choose ${i.description}`} checked={picked.includes(i.id)} onChange={() => toggle(i.id)} className="mt-1 size-5 accent-brand" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-ink">{i.qty} × {i.description}{i.endCustomer && <span className="font-normal text-ink-soft"> · for {i.endCustomer}</span>}</p>
                    <span className="flex items-center gap-2">
                      <Badge tone={stageTone[i.stage]}>{stageLabel[i.stage]}{i.readyOn && i.stage === 'READY' ? ` ${formatDate(i.readyOn)}` : ''}</Badge>
                      <span className="text-sm font-semibold">{formatINR(i.qty * Number(i.chargeRate))}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {formatINR(Number(i.chargeRate))} per piece · Tailor: {i.tailor ? `${i.tailor.name}${Number(i.labourRate) ? ` (pay ${formatINR(Number(i.labourRate))}/pc)` : ' (salaried)'}` : <span className="text-warn">not given yet</span>}
                    {canTick && <button type="button" onClick={() => setTailorFor(i)} className="ml-2 font-medium text-brand hover:underline">{i.tailor ? 'Change tailor' : 'Assign tailor'}</button>}
                    {i.brandCloth && <> · <Badge tone="info">Brand's cloth</Badge></>}
                    {i.billId && <> · <Link to={`/brand-bills/${i.billId}`} className="text-brand hover:underline">{order.bills.find((b) => b.id === i.billId)?.docNo ?? 'Bill'}</Link></>}
                  </p>
                  {values.length > 0 && (
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-5">
                      {values.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 border-b border-dashed border-line"><dt className="truncate text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
                      ))}
                    </dl>
                  )}
                  {i.instructions && <p className="mt-2 text-sm text-ink-soft">Design: {i.instructions}</p>}
                  {mats.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 border-t border-line pt-2 text-sm">
                      {mats.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">{Number(m.qty)} {m.variant.product.unit.code} × {m.description} <span className="text-xs text-muted">{m.charged ? `@ ${formatINR(Number(m.rate))}` : 'used free'}</span></span>
                          <span className="flex items-center gap-2">
                            {m.charged && <span className="font-medium">{formatINR(Number(m.amount))}</span>}
                            {canTick && <button type="button" disabled={busy} onClick={() => removeMaterial(m.id)} aria-label={`Take off ${m.description}`} className="rounded-control p-1 text-muted hover:text-danger"><IconTrash size={15} /></button>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {canTick && (
                    <button type="button" onClick={() => onAddItems(i)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand"><IconPackage size={15} /> Cloth / items from our stock</button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {tailorFor && <BrandTailorModal order={order} piece={tailorFor} onClose={() => setTailorFor(null)} onDone={() => { setTailorFor(null); onChanged() }} />}
    </Card>
  )
}
