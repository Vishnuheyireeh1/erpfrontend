import { IconCheck } from '@tabler/icons-react'
import { cn } from '@/lib/cn'
import { measurementPresets } from '../measurementPresets'

type Props = { chosen: string[]; onToggle: (label: string) => void; onAddAll: (labels: string[]) => void }

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Garment type form: the paper order book's measurements as tick-boxes — tap to add / remove, or "Add all".
// Ticked ones join the list below in the order tapped (reorder there with the arrows).
export function MeasurementPresets({ chosen, onToggle, onAddAll }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-card border border-line bg-page p-3">
      {measurementPresets.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</p>
            <button type="button" onClick={() => onAddAll(g.fields.filter((f) => !chosen.some((c) => same(c, f))))} className="text-xs font-medium text-brand hover:underline">Add all</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.fields.map((f) => {
              const on = chosen.some((c) => same(c, f))
              return (
                <button key={f} type="button" aria-pressed={on} onClick={() => onToggle(f)}
                  className={cn('inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm', on ? 'border-brand bg-brand text-white' : 'border-line bg-card text-ink-soft hover:border-brand')}>
                  {on && <IconCheck size={14} aria-hidden />}{f}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
