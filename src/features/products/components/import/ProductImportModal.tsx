import { IconAlertTriangle, IconCircleCheck, IconFileSpreadsheet } from '@tabler/icons-react'
import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { importApi, type ImportCheck, type ImportDone } from '../../api/import.api'
import { ImportReasons } from './ImportReasons'

type Props = { onClose: () => void; onImported: () => void }

const MAX_MB = 25
const n = (v: number) => v.toLocaleString('en-IN')
const rows = (v: number) => `${n(v)} row${v === 1 ? '' : 's'}`

// Products → "Upload Excel": choose the filled template → it is checked at once (nothing saved) → "Add N items" adds
// every item whose rows are all right; the rest are listed with the reason. Then: how many were added / not added.
export function ProductImportModal({ onClose, onImported }: Props) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [createMissing, setCreateMissing] = useState(false)
  const [check, setCheck] = useState<ImportCheck | null>(null)
  const [done, setDone] = useState<ImportDone | null>(null)
  const [busy, setBusy] = useState<'' | 'check' | 'add'>('')

  const run = async (kind: 'check' | 'add', task: () => Promise<void>) => {
    setBusy(kind)
    try { await task() } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Something went wrong') } finally { setBusy('') }
  }
  const checkFile = (f: File, create: boolean) => run('check', async () => { setCheck(null); setCheck(await importApi.check(f, create)) })
  const pick = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) return toast.error(`File must be ${MAX_MB} MB or smaller — split it into parts`)
    setFile(f)
    void checkFile(f, createMissing)
  }
  const add = () => file && run('add', async () => {
    const res = await importApi.run(file, createMissing)
    if (res.imported) { setDone(res); onImported() } else setCheck(res) // nothing could be added — show why
  })

  if (done) {
    return (
      <Modal open onClose={onClose} size="lg" title="Upload finished" footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
        <div className="flex flex-col gap-3">
          <Box tone="success" title={`${n(done.products)} items added (${rows(done.variants)})`}>
            {done.stock ? `Opening stock ${done.stock.docNo}: ${n(done.stock.items)} items, ₹${done.stock.value.toLocaleString('en-IN')}.` : 'No opening stock typed — they start at 0 stock.'}
            {done.created.sizes + done.created.colours > 0 && ` New in Masters: ${done.created.sizes} sizes, ${done.created.colours} colours.`}
          </Box>
          {done.skippedRows > 0 && <Box tone="warn" title={`${rows(done.skippedRows)} not added`}>Reasons below.</Box>}
          <ImportReasons errors={done.errors} total={done.errorCount} />
        </div>
      </Modal>
    )
  }

  const canAdd = !!check && check.productCount > 0
  return (
    <Modal open onClose={onClose} size="lg" title="Upload products from Excel" description="Use the file from “Download template”. Nothing is saved until you press Add."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!canAdd} loading={busy === 'add'} onClick={add}>{canAdd ? `Add ${n(check!.productCount)} items` : 'Add items'}</Button></>}>
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center gap-3 rounded-card border border-dashed border-line bg-page p-4 text-left hover:border-brand">
          <IconFileSpreadsheet size={32} stroke={1.4} className="shrink-0 text-brand" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{file ? file.name : 'Choose the filled Excel (.xlsx) or CSV file'}</span>
            <span className="block text-xs text-muted">{busy === 'check' ? 'Checking every row…' : file ? 'Click to choose another file' : `Up to ${MAX_MB} MB`}</span>
          </span>
        </button>
        <input ref={input} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
        <Switch label="Add missing sizes and colours to Masters" hint="Off: a size / colour not in Masters is a reason to skip the row." checked={createMissing}
          onChange={(v) => { setCreateMissing(v); if (file) void checkFile(file, v) }} />

        {check && (
          <>
            <Box tone={check.productCount ? 'success' : 'warn'} title={check.productCount ? `${n(check.productCount)} items will be added (${rows(check.variantCount)})` : 'Nothing can be added from this file'}>
              {check.productCount > 0 && (check.stockItems > 0 ? `Opening stock for ${n(check.stockItems)} of them, ₹${check.stockValue.toLocaleString('en-IN')}.` : 'No opening stock typed — they start at 0 stock.')}
            </Box>
            {check.skippedRows > 0 && <Box tone="warn" title={`${rows(check.skippedRows)} will NOT be added`}>Reasons below — fix them in the file and upload again later.</Box>}
            <ImportReasons errors={check.errors} total={check.errorCount} />
          </>
        )}
      </div>
    </Modal>
  )
}

function Box({ tone, title, children }: { tone: 'success' | 'warn'; title: string; children?: ReactNode }) {
  const Icon = tone === 'success' ? IconCircleCheck : IconAlertTriangle
  return (
    <div className={tone === 'success' ? 'flex gap-3 rounded-card bg-success-tint p-3' : 'flex gap-3 rounded-card bg-warn-tint p-3'}>
      <Icon size={22} className={tone === 'success' ? 'shrink-0 text-success' : 'shrink-0 text-warn'} aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-ink">{title}</p>
        {children && <p className="text-sm text-ink-soft">{children}</p>}
      </div>
    </div>
  )
}
