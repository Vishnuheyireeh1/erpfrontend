import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { brandMoneyApi } from '../api/brandMoney.api'
import { clothKindLabel, type ClothKind } from '../moneyTypes'
import type { BrandOrder } from '../types'

type Props = { order: BrandOrder; onChanged: () => void }
const blank = { kind: 'RECEIVED' as ClothKind, description: '', qty: '', unit: 'm', date: todayISO() }
const qtyText = (n: number) => String(Math.round(n * 1000) / 1000)

// The brand's own cloth for this order (not our stock): received from them, used, given back → left with us.
export function BrandClothCard({ order, onChanged }: Props) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState(blank)
  const [busy, setBusy] = useState(false)
  const canAdd = order.status !== 'CANCELLED'

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(ok)
      onChanged()
      return true
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      return false
    } finally {
      setBusy(false)
    }
  }
  const save = async () => {
    if (!f.description.trim()) return toast.error('Write which cloth it is')
    if (!(Number(f.qty) > 0)) return toast.error('Enter the quantity')
    const ok = await run(() => brandMoneyApi.addCloth(order.id, { kind: f.kind, description: f.description.trim(), qty: Number(f.qty), unit: f.unit.trim() || 'm', date: f.date }), 'Cloth entry saved')
    if (ok) setF((x) => ({ ...blank, kind: x.kind, description: x.description, unit: x.unit }))
  }

  return (
    <Card
      title="Brand's own cloth"
      className="mb-5"
      actions={canAdd && !adding ? <Button icon={IconPlus} onClick={() => setAdding(true)}>Add entry</Button> : undefined}
    >
      <p className="mb-3 text-sm text-muted">Cloth the brand gave you for this order — not our stock. Keep it here to know what is left to use or give back.</p>
      {order.cloth.length > 0 && (
        <div className="mb-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-1 font-medium">Cloth</th><th className="text-right font-medium">Received</th><th className="text-right font-medium">Used</th><th className="text-right font-medium">Given back</th><th className="text-right font-medium">Left with us</th></tr></thead>
            <tbody>
              {order.cloth.map((c) => (
                <tr key={`${c.description}-${c.unit}`} className="border-t border-line">
                  <td className="py-1.5">{c.description}</td><td className="text-right">{qtyText(c.received)} {c.unit}</td><td className="text-right">{qtyText(c.used)} {c.unit}</td><td className="text-right">{qtyText(c.returned)} {c.unit}</td>
                  <td className={cn('text-right font-semibold', c.left < 0 ? 'text-danger' : c.left > 0 ? 'text-warn' : 'text-success')}>{qtyText(c.left)} {c.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adding && (
        <div className="mb-3 grid grid-cols-2 gap-3 rounded-control border border-dashed border-line p-3 sm:grid-cols-6">
          <Select label="What happened" className="col-span-2" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as ClothKind })} options={(Object.keys(clothKindLabel) as ClothKind[]).map((k) => ({ value: k, label: clothKindLabel[k] }))} />
          <Input label="Cloth" className="col-span-2" maxLength={120} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="e.g. Cotton printed" />
          <Input label="Qty" type="number" inputMode="decimal" min={0} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
          <Input label="Unit" maxLength={10} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
          <Input label="Date" type="date" className="col-span-2" max={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
            <Button variant="primary" loading={busy} onClick={save}>Save entry</Button>
            <Button onClick={() => setAdding(false)}>Close</Button>
          </div>
        </div>
      )}
      {order.clothEntries.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line text-sm">
          {order.clothEntries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0">{formatDate(e.date)} · <span className={e.kind === 'RECEIVED' ? 'text-success' : 'text-ink-soft'}>{clothKindLabel[e.kind]}</span> · {Number(e.qty)} {e.unit} {e.description}</span>
              {canAdd && <button type="button" disabled={busy} onClick={() => run(() => brandMoneyApi.removeCloth(order.id, e.id), 'Entry removed')} aria-label="Remove entry" className="rounded-control p-1 text-muted hover:text-danger"><IconTrash size={15} /></button>}
            </li>
          ))}
        </ul>
      ) : !adding && <p className="text-sm text-muted">No cloth entries.</p>}
    </Card>
  )
}
