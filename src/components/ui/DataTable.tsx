import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { EmptyState, Spinner } from './Feedback'

/**
 * How a column shows on phones (cards instead of a table):
 * title = bold top-left · badge = top-right · subtitle = second line
 * row = "Label: value" line · hidden = not shown on phone
 */
export type MobileRole = 'title' | 'badge' | 'subtitle' | 'row' | 'hidden'

export type Column<T> = {
  key: string
  header: string
  render?: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  mobile?: MobileRole
}

type Props<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
  /** Number of the first row (paged lists: (page - 1) × page size + 1). */
  startIndex?: number
  /** Show the # column (row number). On by default. */
  numbered?: boolean
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' }

function cellValue<T>(col: Column<T>, row: T): ReactNode {
  if (col.render) return col.render(row)
  return (row as Record<string, ReactNode>)[col.key]
}

// Table on laptop/desktop (lg+), cards on phone and tablet. Paging is done server-side.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyTitle = 'No records yet',
  emptyDescription,
  onRowClick,
  startIndex = 1,
  numbered = true,
}: Props<T>) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size={28} />
      </div>
    )
  }
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />

  const byRole = (role: MobileRole) => columns.filter((c) => (c.mobile ?? 'row') === role)
  const [titleCol] = byRole('title')
  const [badgeCol] = byRole('badge')
  const subtitleCols = byRole('subtitle')
  const rowCols = byRole('row')

  return (
    <>
      {/* Laptop + desktop */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-page text-muted">
              {numbered && <th scope="col" className="w-12 px-4 py-2.5 text-right font-medium">#</th>}
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn('px-4 py-2.5 font-medium', alignClass[col.align ?? 'left'])}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick && (() => onRowClick(row))}
                className={cn('border-t border-line', onRowClick && 'cursor-pointer hover:bg-page')}
              >
                {numbered && <td className="w-12 whitespace-nowrap px-4 py-3 text-right text-muted tabular-nums">{startIndex + index}</td>}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap px-4 py-3',
                      alignClass[col.align ?? 'left'],
                      col.className,
                    )}
                  >
                    {cellValue(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: 1 column of cards · tablet: 2 columns */}
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:hidden">
        {rows.map((row, index) => (
          <li
            key={rowKey(row)}
            onClick={onRowClick && (() => onRowClick(row))}
            className={cn(
              'border-line px-4 py-3',
              index > 0 && 'border-t',
              index === 1 && 'md:border-t-0',
              index % 2 === 0 && 'md:border-r',
              onRowClick && 'cursor-pointer active:bg-page',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              {numbered && <span className="shrink-0 pt-px text-xs text-muted tabular-nums">{startIndex + index}.</span>}
              {/* min-w-0 lets long titles shrink / truncate instead of pushing the badge off-screen */}
              {titleCol && <div className="min-w-0 flex-1 font-medium text-ink">{cellValue(titleCol, row)}</div>}
              {badgeCol && <div className="shrink-0">{cellValue(badgeCol, row)}</div>}
            </div>
            {subtitleCols.length > 0 && (
              <p className="mt-0.5 text-ink-soft">
                {subtitleCols.map((c, i) => (
                  <span key={c.key}>
                    {i > 0 && ' · '}
                    {cellValue(c, row)}
                  </span>
                ))}
              </p>
            )}
            {rowCols.map((col) => (
              <div key={col.key} className="mt-1 flex justify-between gap-3 text-xs">
                <span className="text-muted">{col.header}</span>
                <span className="text-right text-ink">{cellValue(col, row)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </>
  )
}
