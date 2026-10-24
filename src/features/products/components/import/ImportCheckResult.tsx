import { IconAlertTriangle, IconCircleCheck, IconDownload } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { downloadErrorsCsv, type ImportCheck } from '../../api/import.api'

type Props = { check: ImportCheck; importing: boolean; onImport: () => void }

const n = (v: number) => v.toLocaleString('en-IN')

function NewMasters({ toCreate }: { toCreate: ImportCheck['toCreate'] }) {
  const parts = [
    ['sizes', toCreate.sizes],
    ['colours', toCreate.colours],
  ].filter(([, list]) => list.length > 0) as [string, string[]][]
  if (parts.length === 0) return null
  return (
    <p className="mt-2 text-sm text-ink-soft">
      Will also create new{' '}
      {parts.map(([label, list], i) => (
        <span key={label}>
          {i > 0 && ', '}
          {label}: <span className="font-medium">{list.slice(0, 8).join(', ')}{list.length > 8 ? ` +${list.length - 8} more` : ''}</span>
        </span>
      ))}
    </p>
  )
}

// Result of "Check file": either the error list, or a summary + Import button.
export function ImportCheckResult({ check, importing, onImport }: Props) {
  const ok = check.errorCount === 0

  return (
    <Card bodyClassName="p-0">
      <div className="flex items-start gap-3 p-4">
        {ok ? (
          <IconCircleCheck size={24} className="shrink-0 text-success" aria-hidden />
        ) : (
          <IconAlertTriangle size={24} className="shrink-0 text-warn" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">
            {ok ? 'File looks good' : `${n(check.errorCount)} problem${check.errorCount === 1 ? '' : 's'} found — nothing was saved`}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {n(check.rowCount)} rows → {n(check.productCount)} products with {n(check.variantCount)} variants
          </p>
          {ok && (
            <p className="mt-0.5 text-sm text-muted">
              {check.stockItems > 0
                ? `Opening stock for ${n(check.stockItems)} items, value ₹${check.stockValue.toLocaleString('en-IN')}`
                : 'No Opening stock typed — items start at 0 stock'}
            </p>
          )}
          {ok && <NewMasters toCreate={check.toCreate} />}
        </div>
      </div>

      {ok ? (
        <div className="flex justify-end border-t border-line px-4 py-3">
          <Button variant="primary" loading={importing} onClick={onImport}>
            {importing ? 'Importing… keep this page open' : `Import ${n(check.productCount)} products`}
          </Button>
        </div>
      ) : (
        <>
          <div className="max-h-[420px] overflow-y-auto border-t border-line">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-page text-left text-muted">
                <tr>
                  <th className="w-16 px-4 py-2 font-medium">Row</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Column</th>
                  <th className="px-4 py-2 font-medium">Problem</th>
                </tr>
              </thead>
              <tbody>
                {check.errors.map((e, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="px-4 py-2 font-medium text-ink">{e.row}</td>
                    <td className="hidden px-4 py-2 text-ink-soft sm:table-cell">{e.column ?? '—'}</td>
                    <td className="px-4 py-2 text-ink">
                      <span className="text-ink-soft sm:hidden">{e.column ? `${e.column}: ` : ''}</span>
                      {e.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              {check.errorCount > check.errors.length
                ? `Showing the first ${n(check.errors.length)} problems. Fix these and check again.`
                : 'Fix these rows in your file, then check it again.'}
            </p>
            <Button size="sm" icon={IconDownload} onClick={() => downloadErrorsCsv(check.errors)}>
              Download problem list
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
