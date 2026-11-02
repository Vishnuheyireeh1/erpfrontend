import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { PAGE_SIZES, usePageSize } from '@/lib/usePageSize'

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

// The list this footer belongs to: its nearest "top of list" spot above (see DataTable).
function listTopAbove(el: HTMLElement) {
  for (let up = el.parentElement, i = 0; up && i < 4; up = up.parentElement, i++) {
    const spots = [...up.querySelectorAll<HTMLElement>('[data-list-top]')].filter((s) => s.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
    if (spots.length) return spots[spots.length - 1]
  }
  return null
}

// List bar: which rows, page numbers (phones: only prev / next) and "Show 10 / 20 / 50 / 100" — on top of the list.
// Shown on every list that has rows, even a short one.
export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const [, setPageSize] = usePageSize()
  const anchor = useRef<HTMLSpanElement>(null)
  const [top, setTop] = useState<HTMLElement | null>(null)
  // Every render: the list above can be swapped (tabs) while this stays. Only sets state when the spot changed.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const spot = anchor.current && listTopAbove(anchor.current)
    if (spot && spot !== top) setTop(spot)
  })
  if (total <= 0) return null
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const show = (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      Show
      <select
        aria-label="Rows per page"
        value={pageSize}
        onChange={(e) => { setPageSize(Number(e.target.value)); onPageChange(1) }}
        className="h-8 rounded-control border border-line bg-card px-1.5 text-sm text-ink"
      >
        {[...new Set([...PAGE_SIZES, pageSize])].sort((a, z) => a - z).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  )

  const bar = (
    <div className={cn('flex w-full flex-wrap items-center justify-between gap-3', !top && 'border-t border-line px-4 py-3')}>
      <p className="text-xs text-muted">
        {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of{' '}
        {total.toLocaleString('en-IN')}
      </p>
      <div className="flex flex-wrap items-center gap-3">
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
      {show}
      </div>
    </div>
  )

  return (
    <>
      <span ref={anchor} hidden />
      {top ? createPortal(bar, top) : bar}
    </>
  )
}
