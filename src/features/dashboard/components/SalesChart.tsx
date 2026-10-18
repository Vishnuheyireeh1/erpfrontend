import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'

type Props = { days: { date: string; net: number }[]; today: string }

const short = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'narrow', timeZone: 'UTC' })

// Simple bar chart of net sales per day (no chart library — plain bars, readable on a phone).
export function SalesChart({ days, today }: Props) {
  const max = Math.max(1, ...days.map((d) => d.net))
  const total = days.reduce((s, d) => s + d.net, 0)
  const best = days.reduce((b, d) => (d.net > b.net ? d : b), days[0])
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="text-muted">Last 14 days <b className="text-ink">{formatINR(total)}</b></span>
        {best && best.net > 0 && <span className="text-muted">Best day {short(best.date)} · {formatINR(best.net)}</span>}
      </div>
      <div className="flex h-40 items-end gap-1 sm:gap-1.5" role="img" aria-label="Sales for the last 14 days">
        {days.map((d) => (
          <div key={d.date} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <div
              className={cn('w-full rounded-t-sm transition-colors', d.date === today ? 'bg-brand' : 'bg-brand-soft group-hover:bg-brand/70', d.net <= 0 && 'bg-line')}
              style={{ height: `${Math.max(2, (Math.max(0, d.net) / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-control bg-ink px-2 py-1 text-xs text-card group-hover:block">
              {short(d.date)} · {formatINR(d.net)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 sm:gap-1.5">
        {days.map((d) => (
          <span key={d.date} className={cn('min-w-0 flex-1 text-center text-[10px] text-muted', d.date === today && 'font-semibold text-brand')}>
            {d.date === today ? 'Today' : weekday(d.date)}
          </span>
        ))}
      </div>
    </div>
  )
}
