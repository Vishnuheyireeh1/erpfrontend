import { useState } from 'react'
import { usePageSize } from '@/lib/usePageSize'
import { DataTable } from './DataTable'
import { Pagination } from './Pagination'

type Props<T> = Parameters<typeof DataTable<T>>[0]

// A table whose rows are already loaded (statements, day book, reports with totals): shows one page at a time.
// Same props as DataTable.
export function PagedTable<T>({ rows, ...rest }: Props<T>) {
  const [page, setPage] = useState(1)
  const [pageSize] = usePageSize(50)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages) // the list got shorter (new dates / filter)
  const start = (current - 1) * pageSize
  return (
    <>
      <DataTable {...rest} rows={rows.slice(start, start + pageSize)} startIndex={start + 1} />
      <Pagination page={current} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
    </>
  )
}
