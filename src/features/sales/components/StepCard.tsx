import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Props = { step: number; title: string; hint?: string; actions?: ReactNode; className?: string; bodyClassName?: string; children: ReactNode }

// Billing page: one numbered step (1 Customer → 2 What to stitch → …) so staff always know what comes next.
export function StepCard({ step, title, hint, actions, className, bodyClassName, children }: Props) {
  return (
    <section className={cn('rounded-card border border-line bg-card', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{step}</span>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">{title}</h2>
            {hint && <p className="text-xs text-muted">{hint}</p>}
          </div>
        </div>
        {actions}
      </header>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}
