import type { ReactNode } from 'react'
import { DateRange, type DateRangeValue } from '@/components/ui/DateRange'
import { ExportButton } from '@/components/ui/ExportButton'

type Props = {
  range: DateRangeValue
  onRange: (r: DateRangeValue) => void
  exportPath: string
  params: Record<string, string | number | boolean | undefined>
  children?: ReactNode // extra filters (e.g. "Only GST customers")
}

// Dates + extra filters on the left, Excel on the right (stacks on phones).
export function ReportToolbar({ range, onRange, exportPath, params, children }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <DateRange value={range} onChange={onRange} />
        {children}
      </div>
      <ExportButton path={exportPath} params={params} />
    </div>
  )
}
