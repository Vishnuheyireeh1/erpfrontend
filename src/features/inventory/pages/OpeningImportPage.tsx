import { IconAlertTriangle, IconArrowLeft, IconCircleCheck, IconDownload, IconFileSpreadsheet } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/toast-context'
import { downloadErrorsCsv } from '@/features/products/api/import.api'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { inventoryApi, type OpeningCheck } from '../api/inventory.api'
import { todayISO } from '../constants'

const steps = [
  'Download the sheet — it lists every item with its barcode and purchase price.',
  'Count the stock and type it in the "Opening qty" column. Leave items you don\'t have empty.',
  'Change "Unit cost" if the real cost differs from the purchase price.',
  'Upload and check. Nothing is saved until every row is correct.',
]

// /stock/opening/import — the go-live stock count from Excel, saved as ONE opening document.
export function OpeningImportPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [docDate, setDocDate] = useState(todayISO)
  const [check, setCheck] = useState<OpeningCheck | null>(null)
  const [busy, setBusy] = useState<'' | 'template' | 'check' | 'import'>('')

  const run = async (kind: typeof busy, task: () => Promise<void>) => {
    setBusy(kind)
    try {
      await task()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy('')
    }
  }

  const doImport = () =>
    run('import', async () => {
      const res = await inventoryApi.importOpeningFile(file!, docDate)
      if (res.imported && res.document) {
        toast.success(`${res.document.docNo} saved — ${res.lines?.toLocaleString('en-IN')} items`)
        navigate(`/stock/documents/${res.document.id}`)
      } else {
        setCheck({ lines: 0, value: 0, errors: res.errors ?? [], errorCount: res.errorCount ?? 0 })
      }
    })

  const ok = check && check.errorCount === 0 && check.lines > 0

  return (
    <>
      <button type="button" onClick={() => navigate('/stock/new?kind=opening')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Opening stock
      </button>
      <PageHeader title="Import opening stock" subtitle="Your go-live stock count from Excel, saved as one opening-stock document." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="1. Get the stock sheet">
          <ol className="mb-4 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-soft">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <Button icon={IconDownload} loading={busy === 'template'} onClick={() => run('template', inventoryApi.downloadOpeningTemplate)}>
            Download stock sheet
          </Button>
        </Card>

        <Card title="2. Upload and check">
          <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full items-center gap-3 rounded-card border border-dashed border-line bg-page p-4 text-left hover:border-brand">
            <IconFileSpreadsheet size={32} stroke={1.4} className="shrink-0 text-brand" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{file ? file.name : 'Choose the filled stock sheet (.xlsx or .csv)'}</span>
              <span className="block text-xs text-muted">{file ? 'Click to change' : 'Up to 25 MB'}</span>
            </span>
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setCheck(null) } e.target.value = '' }} />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input label="Opening stock date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} className="sm:w-48" />
            <Button className="sm:ml-auto" variant={check ? 'secondary' : 'primary'} disabled={!file} loading={busy === 'check'} onClick={() => run('check', async () => setCheck(await inventoryApi.checkOpeningFile(file!)))}>
              Check file
            </Button>
          </div>
        </Card>
      </div>

      {check && (
        <Card className="mt-5" bodyClassName="p-0">
          <div className="flex items-start gap-3 p-4">
            {ok ? <IconCircleCheck size={24} className="shrink-0 text-success" /> : <IconAlertTriangle size={24} className="shrink-0 text-warn" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {ok ? `Ready: ${check.lines.toLocaleString('en-IN')} items, value ${formatINR(check.value)}` : check.errorCount ? `${check.errorCount.toLocaleString('en-IN')} problems found — nothing was saved` : 'No rows have an opening qty'}
              </p>
              {!ok && check.errors.length > 0 && (
                <ul className="mt-2 max-h-72 overflow-y-auto text-sm">
                  {check.errors.map((e, i) => <li key={i} className="border-t border-line py-1.5"><span className="font-medium">Row {e.row}:</span> {e.message}</li>)}
                </ul>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end">
            {!ok && check.errors.length > 0 && <Button size="sm" icon={IconDownload} onClick={() => downloadErrorsCsv(check.errors)}>Download problem list</Button>}
            {ok && <Button variant="primary" loading={busy === 'import'} onClick={doImport}>{busy === 'import' ? 'Saving… keep this page open' : 'Save opening stock'}</Button>}
          </div>
        </Card>
      )}
    </>
  )
}
