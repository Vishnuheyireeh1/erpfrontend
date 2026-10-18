import { cn } from '@/lib/cn'
import { formatINR2 } from '@/lib/format'
import type { AmountLine } from '../types'

type Props = { lines: AmountLine[]; total?: { label: string; value: number }; empty?: string; onOpen?: (code: string) => void; minus?: boolean }

// A list of accounts with amounts (balance sheet / P&L). Real accounts open their ledger; totals are bold.
export function AmountList({ lines, total, empty = 'Nothing here.', onOpen, minus }: Props) {
  const opens = (code: string) => onOpen && /^(\d|E)/.test(code) // P-YEAR, 1100A … are worked out, not accounts
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {lines.length === 0 && <p className="text-muted">{empty}</p>}
      {lines.map((l) => (
        <div key={l.code} className="flex justify-between gap-3">
          {opens(l.code) ? (
            <button type="button" onClick={() => onOpen!(l.code)} className="min-w-0 truncate text-left text-ink-soft hover:text-brand hover:underline">{l.name}</button>
          ) : (
            <span className="min-w-0 truncate text-ink-soft">{l.name}</span>
          )}
          <span className={cn('shrink-0 tabular-nums', l.amount < 0 && 'text-danger')}>{minus && l.amount > 0 ? '− ' : ''}{formatINR2(l.amount)}</span>
        </div>
      ))}
      {total && (
        <div className="mt-1 flex justify-between gap-3 border-t border-line pt-2 font-semibold text-ink">
          <span>{total.label}</span>
          <span className={cn('tabular-nums', total.value < 0 && 'text-danger')}>{formatINR2(total.value)}</span>
        </div>
      )}
    </div>
  )
}
