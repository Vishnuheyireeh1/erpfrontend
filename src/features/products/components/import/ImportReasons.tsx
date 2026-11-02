import { IconDownload } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { downloadErrorsCsv, type ImportError } from '../../api/import.api'

type Props = { errors: ImportError[]; total: number }

// Rows NOT added from the import file, with the reason for each (row numbers = rows in the Excel file).
export function ImportReasons({ errors, total }: Props) {
  if (!errors.length) return null
  return (
    <div className="rounded-card border border-line">
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-page text-left text-muted">
            <tr>
              <th className="w-16 px-3 py-2 font-medium">Row</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Column</th>
              <th className="px-3 py-2 font-medium">Why not added</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((e, i) => (
              <tr key={i} className="border-t border-line align-top">
                <td className="px-3 py-2 font-medium text-ink">{e.row}</td>
                <td className="hidden px-3 py-2 text-ink-soft sm:table-cell">{e.column ?? '—'}</td>
                <td className="px-3 py-2 text-ink">
                  <span className="text-ink-soft sm:hidden">{e.column ? `${e.column}: ` : ''}</span>
                  {e.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 border-t border-line px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{total > errors.length ? `Showing the first ${errors.length} of ${total}.` : 'Fix these rows in the file and upload it again — added items are skipped next time.'}</p>
        <Button size="sm" icon={IconDownload} onClick={() => downloadErrorsCsv(errors)}>Download reasons</Button>
      </div>
    </div>
  )
}
