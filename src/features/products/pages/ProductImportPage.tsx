import { IconArrowLeft, IconCircleCheck, IconDownload, IconFileSpreadsheet } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Feedback'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { importApi, type ImportCheck, type ImportDone } from '../api/import.api'
import { ImportCheckResult } from '../components/import/ImportCheckResult'

const MAX_MB = 25

const steps = [
  'Download the template and fill one row per size / colour.',
  'Rows with the same product name + category become one product.',
  'Leave Barcode empty and the ERP creates one.',
  'Check the file — nothing is saved until every row is correct.',
]

// /products/import — template → check → import (all or nothing).
export function ProductImportPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [createMissing, setCreateMissing] = useState(false)
  const [check, setCheck] = useState<ImportCheck | null>(null)
  const [busy, setBusy] = useState<'' | 'template' | 'check' | 'import'>('')
  const [done, setDone] = useState<ImportDone | null>(null)

  const pick = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) return toast.error(`File must be ${MAX_MB} MB or smaller — split it into parts`)
    setFile(f)
    setCheck(null)
  }

  const run = async <T,>(kind: typeof busy, task: () => Promise<T>) => {
    setBusy(kind)
    try {
      return await task()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy('')
    }
  }

  const doCheck = () => file && run('check', async () => setCheck(await importApi.check(file, createMissing)))

  const doImport = () =>
    file &&
    run('import', async () => {
      const res = await importApi.run(file, createMissing)
      if (res.imported) setDone(res)
      else setCheck(res) // something changed since the check — show the new problems
    })

  if (done) {
    return (
      <Card>
        <EmptyState
          icon={IconCircleCheck}
          title={`${done.products.toLocaleString('en-IN')} products imported`}
          description={`${done.variants.toLocaleString('en-IN')} variants with barcodes are ready.${done.stock ? ` Opening stock ${done.stock.docNo}: ${done.stock.items.toLocaleString('en-IN')} items, value ₹${done.stock.value.toLocaleString('en-IN')}.` : ' No opening stock — add it under Stock.'} New: ${done.created.brands} brands, ${done.created.sizes} sizes, ${done.created.colours} colours.`}
          action={<Button variant="primary" onClick={() => navigate('/products')}>View products</Button>}
        />
      </Card>
    )
  }

  return (
    <>
      <button type="button" onClick={() => navigate('/products')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Products
      </button>
      <PageHeader title="Import products" subtitle="Add many products at once from Excel or CSV." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card title="1. Get the template">
          <ol className="mb-4 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-soft">
            {steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <Button icon={IconDownload} loading={busy === 'template'} onClick={() => run('template', importApi.downloadTemplate)}>
            Download Excel template
          </Button>
          <p className="mt-3 text-xs text-muted">The template's "Lists" sheet shows every valid category, unit, size and colour.</p>
        </Card>

        <Card title="2. Upload and check">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-card border border-dashed border-line bg-page p-4 text-left hover:border-brand"
          >
            <IconFileSpreadsheet size={32} stroke={1.4} className="shrink-0 text-brand" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{file ? file.name : 'Choose an Excel (.xlsx) or CSV file'}</span>
              <span className="block text-xs text-muted">
                {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB — click to change` : `Up to ${MAX_MB} MB (about 2 lakh rows)`}
              </span>
            </span>
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />

          <div className="mt-4">
            <Switch
              label="Create missing brands, sizes and colours"
              hint="Off: unknown names are reported as problems. Categories and units must already exist."
              checked={createMissing}
              onChange={(v) => { setCreateMissing(v); setCheck(null) }}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant={check ? 'secondary' : 'primary'} disabled={!file} loading={busy === 'check'} onClick={doCheck}>
              {busy === 'check' ? 'Checking…' : 'Check file'}
            </Button>
          </div>
        </Card>
      </div>

      {check && (
        <div className="mt-5">
          <ImportCheckResult check={check} importing={busy === 'import'} onImport={doImport} />
        </div>
      )}
    </>
  )
}
