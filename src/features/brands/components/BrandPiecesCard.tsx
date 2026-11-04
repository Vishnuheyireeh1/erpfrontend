import { IconPackage, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/toast-context'
import { orderedValues } from '@/features/workshop/api/workshop.api'
import { ApiError } from '@/lib/api'
import { formatDate, formatINR } from '@/lib/format'
import { brandOrderApi } from '../api/brandOrder.api'
import { stageLabel, stageTone, type BrandCost, type BrandOrder, type BrandPiece } from '../types'

type Props = { order: BrandOrder; onChanged: () => void; onAddItems: (piece: BrandPiece) => void; onAssign: () => void }

// Pieces of a brand order: what each one is, who works on it, its measurements and stock items.
// Stages and workers are changed from the page's Change stage / Assign workers popups.
export function BrandPiecesCard({ order, onChanged, onAddItems, onAssign }: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const open = order.status === 'OPEN'
  const removeMaterial = async (id: number) => {
    setBusy(true)
    try {
      await brandOrderApi.removeMaterial(order.id, id)
      toast.success('Item taken off — back in stock')
      onChanged()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title={`Pieces (${order.pieces})`} className="mb-5">
      <ul className="flex flex-col gap-3">
        {order.items.map((i) => {
          const values = orderedValues(i.measurements, i.garmentType.fields)
          const mats = order.materials.filter((m) => m.itemId === i.id)
          const canTick = open && i.stage !== 'DELIVERED'
          return (
            <li key={i.id} className="rounded-card border border-line p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-ink">{i.qty} × {i.description}{i.endCustomer && <span className="font-normal text-ink-soft"> · for {i.endCustomer}</span>}</p>
                    <span className="flex items-center gap-2">
                      <Badge tone={stageTone[i.stage]}>{stageLabel[i.stage]}{i.readyOn && i.stage === 'READY' ? ` ${formatDate(i.readyOn)}` : ''}</Badge>
                      <span className="text-sm font-semibold">{formatINR(i.qty * Number(i.chargeRate) + i.charges.reduce((s, c) => s + Number(c.amount), 0))}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {formatINR(Number(i.chargeRate))} per piece · Tailor: {i.tailor ? `${i.tailor.name}${Number(i.labourRate) ? ` (pay ${formatINR(Number(i.labourRate))}/pc)` : ' (salaried)'}` : <span className="text-warn">not given yet</span>}
                    {canTick && <button type="button" onClick={onAssign} className="ml-2 font-medium text-brand hover:underline">{i.tailor ? 'Change' : 'Assign'}</button>}
                    {i.brandCloth && <> · <Badge tone="info">Brand's cloth</Badge></>}
                    {i.billId && <> · <Link to={`/brand-bills/${i.billId}`} className="text-brand hover:underline">{order.bills.find((b) => b.id === i.billId)?.docNo ?? 'Bill'}</Link></>}
                  </p>
                  <PieceWho piece={i} costs={order.costs} />
                  {values.length > 0 && (
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-5">
                      {values.map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 border-b border-dashed border-line"><dt className="truncate text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
                      ))}
                    </dl>
                  )}
                  {i.instructions && <p className="mt-2 text-sm text-ink-soft">Design: {i.instructions}</p>}
                  {i.charges.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 border-t border-line pt-2 text-sm">
                      {i.charges.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">{c.name} <span className="text-xs text-muted">{Number(c.qty)} × {formatINR(Number(c.rate))}</span></span>
                          <span className="font-medium">{formatINR(Number(c.amount))}</span>
                        </li>
                      ))}
                    </ul>
                  )}
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
    </Card>
  )
}

// Cutting master (the piece's Cutting work line) and who measured — set on the order form.
function PieceWho({ piece, costs }: { piece: BrandPiece; costs: BrandCost[] }) {
  const cut = costs.find((c) => c.itemId === piece.id && c.tailor && /^cutting$/i.test(c.category.name))
  if (!cut && !piece.measuredBy) return null
  return (
    <p className="text-xs text-muted">
      {cut && <>Cutting: {cut.tailor!.name}{Number(cut.rate) ? ` (pay ${formatINR(Number(cut.rate))}/pc)` : ' (salaried)'}</>}
      {cut && piece.measuredBy && ' · '}
      {piece.measuredBy && <>Measured by {piece.measuredBy.name}</>}
    </p>
  )
}
