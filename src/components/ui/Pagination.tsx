import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { cn } from '@/lib/cn'

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

// Page numbers around the current page: 1 … 4 5 [6] 7 8 … 20
function pageWindow(page: number, pages: number): Array<number | '…'> {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages))
  const sorted = [...set].sort((a, b) => a - b)
  const out: Array<number | '…'> = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

const btn = 'flex h-8 min-w-8 items-center justify-center rounded-control px-2 text-sm'

// Server-side pagination footer. Phones show only prev / next.
export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-xs text-muted">
        {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of{' '}
        {total.toLocaleString('en-IN')}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(btn, 'text-ink-soft hover:bg-page disabled:opacity-40')}
          aria-label="Previous page"
        >
          <IconChevronLeft size={18} />
        </button>
        {pageWindow(page, pages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="hidden px-1 text-muted sm:inline">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                btn,
                'hidden sm:flex',
                p === page ? 'bg-brand-tint font-medium text-brand' : 'text-ink-soft hover:bg-page',
              )}
            >
              {p}
            </button>
          ),
        )}
        <span className="px-2 text-xs text-muted sm:hidden">
          {page} / {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className={cn(btn, 'text-ink-soft hover:bg-page disabled:opacity-40')}
          aria-label="Next page"
        >
          <IconChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
