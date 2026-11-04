import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ChipSelect } from '@/components/ui/ChipSelect'
import { controlClass } from '@/components/ui/controlClass'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/toast-context'
import { costCategoryApi, garmentApi } from '@/features/workshop/api/workshop.api'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'

export type PayKind = 'SALARY' | 'DAY' | 'PIECE' | 'BOTH'
export type WorkForm = {
  pay: PayKind
  stitches: boolean
  works: Record<number, string> // ticked work (Cutting, Lining …) → their usual pay per piece
  rates: Record<number, string> // stitching pay per garment (empty = garment's usual tailor pay)
  openingBalance: string
}

type Props = { work: WorkForm; onChange: (w: WorkForm) => void; hasHistory: boolean; salary: string; onSalary: (v: string) => void; dayRate: string; onDayRate: (v: string) => void }

const STITCHING = 0 // chip value for Stitching (other chips are work type ids)
const rateBox = (label: string, value: string, onChange: (v: string) => void, placeholder = '0') => (
  <div className="w-24 shrink-0">
    <input type="number" inputMode="decimal" min={0} aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={cn(controlClass(), 'h-9 text-right')} />
  </div>
)

// Staff form → HOW they are paid (monthly salary / per day / per piece) and WHAT work they do (Stitching, Cutting … — tick).
// Only the boxes for that answer show. Per piece → their usual pay per piece, filled in on jobs (can be changed there).
export function StaffWorkSection({ work, onChange, hasHistory, salary, onSalary, dayRate, onDayRate }: Props) {
  const toast = useToast()
  const garments = useApiQuery('garments', () => garmentApi.list())
  const cats = useApiQuery('cost-categories', () => costCategoryApi.list())
  const [newWork, setNewWork] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [wasBoth] = useState(work.pay === 'BOTH') // no longer offered; only someone already paid both ways still sees it
  const set = (patch: Partial<WorkForm>) => onChange({ ...work, ...patch })
  const perPiece = work.pay === 'PIECE' || work.pay === 'BOTH'
  const ticked = (cats.data ?? []).filter((c) => c.id in work.works)

  const toggle = (v: number) => {
    if (v === STITCHING) return set({ stitches: !work.stitches })
    const works = { ...work.works }
    if (v in works) delete works[v]
    else works[v] = ''
    set({ works })
  }
  const addWork = async () => {
    if (!newWork?.trim()) return
    setAdding(true)
    try {
      const c = await costCategoryApi.create({ name: newWork.trim(), defaultPaidBy: 'SALARIED' })
      cats.reload()
      set({ works: { ...work.works, [c.id]: '' } })
      setNewWork(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add the work')
    } finally {
      setAdding(false)
    }
  }
  const choice = (v: PayKind, title: string, hint: string) => (
    <button type="button" aria-pressed={work.pay === v} onClick={() => set({ pay: v })} className={cn('flex-1 rounded-control border px-3 py-2 text-left', work.pay === v ? 'border-brand bg-brand-tint' : 'border-line hover:border-brand')}>
      <span className="block text-sm font-medium text-ink">{title}</span>
      <span className="block text-xs text-muted">{hint}</span>
    </button>
  )

  return (
    <div className="mt-5 rounded-card border border-line p-4">
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">How is this person paid?</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {choice('SALARY', 'Monthly salary', 'A fixed amount every month')}
            {choice('DAY', 'Per day', 'An amount for each day they work')}
            {choice('PIECE', 'Per piece', 'Paid for each piece they finish')}
            {wasBoth && choice('BOTH', 'Both', 'Fixed salary and money for each piece')}
          </div>
        </div>
        {work.pay === 'DAY' && <Input label="Amount per day ₹" required type="number" inputMode="decimal" min={0} value={dayRate} onChange={(e) => onDayRate(e.target.value)} hint="Type the days worked each month in Monthly salary. Pay = amount × days" className="sm:w-80" />}
        {(work.pay === 'SALARY' || work.pay === 'BOTH') && <Input label="Salary per month ₹" required type="number" inputMode="decimal" min={0} value={salary} onChange={(e) => onSalary(e.target.value)} hint="Paid every month with a payslip" className="sm:w-80" />}
        <div>
          <ChipSelect
            label="What work do they do?"
            options={[{ value: STITCHING, label: 'Stitching' }, ...(cats.data ?? []).filter((c) => c.isActive || c.id in work.works).map((c) => ({ value: c.id, label: c.name }))]}
            selected={[...(work.stitches ? [STITCHING] : []), ...ticked.map((c) => c.id)]}
            onToggle={toggle}
          />
          {!perPiece && !work.stitches && !Object.keys(work.works).length && (
            <p className="mt-1.5 text-xs text-muted">{hasHistory ? 'Nothing ticked — their old job work and balance are kept' : "Leave empty if they don't do this work (sales staff, teachers …)"}</p>
          )}
          {newWork === null ? (
            <button type="button" onClick={() => setNewWork('')} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"><IconPlus size={15} /> New work</button>
          ) : (
            <div className="mt-2 flex gap-2">
              <Input aria-label="New work" value={newWork} onChange={(e) => setNewWork(e.target.value)} placeholder="Aari work" autoFocus className="sm:w-60" />
              <Button onClick={addWork} loading={adding}>Add</Button>
              <Button variant="ghost" onClick={() => setNewWork(null)}>Cancel</Button>
            </div>
          )}
        </div>
        {perPiece && (
          <div>
            <p className="text-sm font-medium text-ink">How much for each piece?</p>
            <p className="mb-2 text-xs text-muted">{work.stitches ? 'Stitching left empty uses the usual amount. ' : ''}You can still change it on each job.</p>
            <ul className="divide-y divide-line rounded-card border border-line">
              {work.stitches && (garments.data ?? []).filter((g) => g.isActive || g.id in work.rates).map((g) => (
                <li key={`g${g.id}`} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">Stitching · {g.name}</span>
                  <span className="hidden text-xs text-muted sm:inline">usual {formatINR(Number(g.defaultLabour))}</span>
                  {rateBox(`${g.name} stitching pay`, work.rates[g.id] ?? '', (v) => set({ rates: { ...work.rates, [g.id]: v } }), String(Number(g.defaultLabour)))}
                </li>
              ))}
              {ticked.map((c) => (
                <li key={`w${c.id}`} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.name}</span>
                  {rateBox(`${c.name} pay per piece`, work.works[c.id], (v) => set({ works: { ...work.works, [c.id]: v } }))}
                </li>
              ))}
              {!work.stitches && !ticked.length && <li className="px-3 py-2 text-sm text-muted">Tick the work they do above</li>}
            </ul>
            <Input label="Old balance we owe them ₹" type="number" inputMode="decimal" value={work.openingBalance} onChange={(e) => set({ openingBalance: e.target.value })} hint="Money owed from before this software. If they took an advance, put a minus" className="mt-4 sm:w-80" />
          </div>
        )}
      </div>
    </div>
  )
}
