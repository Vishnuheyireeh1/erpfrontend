import { IconRuler, IconX } from '@tabler/icons-react'
import { useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { JobItemEditor } from '@/features/jobs/components/JobItemEditor'
import { garmentPatch, itemError, newItem, type ItemDraft } from '@/features/jobs/jobDrafts'
import { garmentApi, measurementApi, tailorApi } from '@/features/workshop/api/workshop.api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import type { Billing } from '../hooks/useBilling'

const cell = 'h-9 w-full rounded-[6px] border border-transparent bg-transparent px-2 text-right text-sm tabular-nums outline-none hover:border-line focus:border-brand focus:bg-card'

// Fast bill → garments to stitch (a garment makes it a job bill). Pick a garment from "Add garment" (type its first
// letter, Enter); Pieces and Price are boxes; F6 (or the ruler button) opens that garment's measurements and design.
export function FastStitchGrid({ b, measureFor, onMeasure }: { b: Billing; measureFor: string | null; onMeasure: (key: string | null) => void }) {
  const garments = useApiQuery('garments', () => garmentApi.list())
  const tailors = useApiQuery('tailor-options', () => tailorApi.options())
  const measures = useApiQuery(['bill-measures', b.customer?.id], () => (b.customer ? measurementApi.list(b.customer.id) : Promise.resolve([])))
  const latestFor = (gid: number) => measures.data?.find((m) => m.garmentTypeId === gid)?.values
  const [pick, setPick] = useState('')
  const [active, setActive] = useState(0)
  const matches = (garments.data ?? []).filter((g) => g.isActive && g.name.toLowerCase().includes(pick.trim().toLowerCase())).slice(0, 8)
  const ready = garments.data && tailors.data
  const set = (key: string, patch: Partial<ItemDraft>) => b.setStitch(b.stitch.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  const add = (gid: string) => {
    if (!gid || !ready) return
    b.setStitch([...b.stitch, { ...newItem(), ...garmentPatch(gid, garments.data!, tailors.data!, '', latestFor(Number(gid))) }])
    setPick('')
    setActive(0)
  }
  const onPickKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, Math.min(matches.length - 1, a + (e.key === 'ArrowDown' ? 1 : -1)))) }
    if (e.key === 'Enter' && pick.trim() && matches[active]) { e.preventDefault(); add(String(matches[active].id)) }
  }
  const editing = b.stitch.find((d) => d.key === measureFor)
  const keyF6 = (e: KeyboardEvent, key: string) => { if (e.key === 'F6') { e.preventDefault(); onMeasure(key) } }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-page text-xs font-medium text-muted">
              <th className="w-10 px-2 py-2 text-left">Sl</th>
              <th className="px-2 text-left">Garment</th>
              <th className="w-24 px-2 text-right">Pieces</th>
              <th className="w-28 px-2 text-right">Price ₹</th>
              <th className="w-28 px-2 text-right">Total ₹</th>
              <th className="w-44 px-2 text-left">Measurements (F6)</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {b.stitch.map((d, i) => {
              const err = b.showErrors ? itemError(d) : undefined
              const filled = Object.values(d.measurements).filter(Boolean).length
              return (
                <tr key={d.key} className={cn('border-b border-line', err && 'bg-danger-tint')} title={err}>
                  <td className="px-2 text-muted">{i + 1}</td>
                  <td className="px-2 font-medium text-ink">{d.description || garments.data?.find((g) => String(g.id) === d.garmentTypeId)?.name}{d.ownFabric && <span className="ml-1 text-xs font-normal text-muted">· own cloth</span>}</td>
                  <td className="px-1"><input value={d.qty} onChange={(e) => set(d.key, { qty: e.target.value })} onKeyDown={(e) => keyF6(e, d.key)} onFocus={(e) => e.target.select()} inputMode="numeric" aria-label="Pieces" className={cell} /></td>
                  <td className="px-1"><input value={d.chargeRate} onChange={(e) => set(d.key, { chargeRate: e.target.value })} onKeyDown={(e) => keyF6(e, d.key)} onFocus={(e) => e.target.select()} inputMode="decimal" aria-label="Price per piece" className={cell} /></td>
                  <td className="px-2 text-right font-semibold tabular-nums">{formatINR((Number(d.qty) || 0) * (Number(d.chargeRate) || 0))}</td>
                  <td className="px-2">
                    <button type="button" onClick={() => onMeasure(d.key)} className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
                      <IconRuler size={15} /> {filled ? `${filled} filled` : 'Add measurements'}
                    </button>
                  </td>
                  <td><button type="button" tabIndex={-1} onClick={() => b.setStitch(b.stitch.filter((x) => x.key !== d.key))} aria-label={`Remove ${d.description}`} className="rounded p-1 text-muted hover:text-danger"><IconX size={15} /></button></td>
                </tr>
              )
            })}
            <tr>
              <td className="px-2 text-muted">{b.stitch.length + 1}</td>
              <td className="px-1 py-1" colSpan={2}>
                <div className="relative">
                  <input
                    value={pick}
                    disabled={!ready}
                    onChange={(e) => { setPick(e.target.value); setActive(0) }}
                    onKeyDown={onPickKey}
                    placeholder="+ Type garment to stitch (e.g. blo) · Enter"
                    aria-label="Add a garment to stitch"
                    autoComplete="off"
                    className="h-9 w-full rounded-[6px] border border-line bg-card px-2 text-sm outline-none focus:border-brand"
                  />
                  {pick.trim() && (
                    <ul role="listbox" className="absolute left-0 right-0 top-10 z-10 rounded-control border border-line bg-card shadow-lg">
                      {matches.map((g, k) => (
                        <li key={g.id} role="option" aria-selected={k === active}>
                          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(String(g.id))} className={cn('block w-full px-3 py-2 text-left text-sm', k === active && 'bg-brand-tint')}>{g.name}</button>
                        </li>
                      ))}
                      {!matches.length && <li className="px-3 py-2 text-sm text-muted">No garment found</li>}
                    </ul>
                  )}
                </div>
              </td>
              <td colSpan={4} className="px-2 text-xs text-muted">{b.stitch.length ? 'A garment makes this a stitching job bill' : 'Optional — only for stitching'}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {editing && ready && (
        <Modal open onClose={() => onMeasure(null)} size="lg" title={`Measurements · ${editing.description}`} description="Esc or Done to go back to the bill"
          footer={<Button variant="primary" onClick={() => onMeasure(null)}>Done</Button>}>
          <JobItemEditor index={b.stitch.indexOf(editing)} draft={editing} garments={garments.data!} tailors={tailors.data!} latestFor={latestFor} onChange={(p) => set(editing.key, p)} simple showMeasuredBy />
        </Modal>
      )}
    </>
  )
}
