import { IconBell } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useApiQuery } from '@/lib/useApiQuery'

type Todo = { late: number; dueToday: number; ready: number; waiting: number; low: number; total: number }

const ITEMS: { key: keyof Omit<Todo, 'total'>; label: string; hint: string; to: string; tone: string }[] = [
  { key: 'late', label: 'Jobs late', hint: 'Ready-by date has passed', to: '/jobs?view=overdue', tone: 'text-danger' },
  { key: 'dueToday', label: 'Jobs to be ready today', hint: 'Promised for today', to: '/jobs?view=due', tone: 'text-warn' },
  { key: 'ready', label: 'Ready — call the customer', hint: 'Waiting to be handed over', to: '/jobs?view=ready', tone: 'text-success' },
  { key: 'waiting', label: 'Jobs without a tailor', hint: 'Assign workers in Job work', to: '/tailors', tone: 'text-brand' },
  { key: 'low', label: 'Items running low', hint: 'Stock at or below the alert level', to: '/stock?status=low', tone: 'text-warn' },
]

// Top-bar bell → "To do today": jobs late / due today / ready, jobs without a tailor, items running low.
// Each line opens the list to act on. Refreshes every time it is opened.
export function TodoBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [tick, setTick] = useState(0)
  const q = useApiQuery(['todo', tick], () => api.get<Todo>('/todo'))
  const t = q.data ?? q.lastData
  const go = (to: string) => { setOpen(false); navigate(to) }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setTick((x) => x + 1) }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className="relative rounded-control p-2 text-ink-soft hover:bg-page"
        aria-label={`To do today${t?.total ? ` — ${t.total}` : ''}`}
        aria-expanded={open}
      >
        <IconBell size={20} stroke={1.6} />
        {!!t?.total && <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-brand px-1 text-center text-[11px] font-semibold leading-5 text-white">{t.total > 99 ? '99+' : t.total}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-72 rounded-card border border-line bg-card p-1 shadow-lg">
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">To do today</p>
          {!t ? <p className="px-3 py-3 text-sm text-muted">Loading…</p> : t.total === 0 ? (
            <p className="px-3 py-3 text-sm text-success">All done — nothing waiting. 🎉</p>
          ) : (
            <ul>
              {ITEMS.filter((i) => t[i.key] > 0).map((i) => (
                <li key={i.key}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(i.to)} className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-left hover:bg-page">
                    <span className={cn('w-8 shrink-0 text-right text-lg font-semibold', i.tone)}>{t[i.key]}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{i.label}</span>
                      <span className="block text-xs text-muted">{i.hint}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
