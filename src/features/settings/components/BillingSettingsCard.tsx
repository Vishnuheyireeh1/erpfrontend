import { IconPrinter } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { printText } from '@/features/sales/print/printing'
import type { PrintSettings } from '@/features/sales/types'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useApiQuery } from '@/lib/useApiQuery'
import type { AppSettings } from '../hooks/useBusinessProfile'

type Props = { settings: AppSettings; onSaved: () => void }

// A ruler line so the shop can check that `columns` characters fit across the paper.
function testPage(cols: number) {
  const ruler = Array.from({ length: cols }, (_, i) => ((i + 1) % 10 === 0 ? String(((i + 1) / 10) % 10) : '-')).join('')
  return ['SAIRANDHRI DESIGNER BOUTIQUE', 'Test print', ruler, `${cols} characters per line. The ruler above must fit on one line.`, ruler].join('\n')
}

// Sales bill options: clothing GST rule and the bill printer — straight to the dot-matrix (recommended) or the print window.
export function BillingSettingsCard({ settings, onSaved }: Props) {
  const toast = useToast()
  const saved = settings['billing.print']
  const [p, setP] = useState({
    paperWidthIn: String(saved.paperWidthIn), paperHeightIn: String(saved.paperHeightIn), columns: String(saved.columns),
    mode: saved.mode ?? 'browser', printer: saved.printer ?? '', feedLines: String(saved.feedLines ?? 6),
  })
  const [busy, setBusy] = useState(false)
  const direct = p.mode === 'direct'
  const printers = useApiQuery(['printers', direct], () => (direct ? api.get<{ items: string[] }>('/system/printers').then((r) => r.items) : Promise.resolve([])))
  const values: PrintSettings = {
    paperWidthIn: Number(p.paperWidthIn), paperHeightIn: Number(p.paperHeightIn) || 0, columns: Math.round(Number(p.columns)) || 80,
    mode: p.mode, printer: p.printer, feedLines: Math.round(Number(p.feedLines)) || 0,
  }
  const set = (patch: Partial<typeof p>) => setP((x) => ({ ...x, ...patch }))

  const put = async (body: Record<string, unknown>, message: string) => {
    setBusy(true)
    try {
      await api.put('/settings', body)
      toast.success(message)
      onSaved()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  // Direct test print uses the SAVED printer — save first.
  const test = async () => {
    if (direct) {
      if (!values.printer) return toast.error('Choose the printer first')
      await put({ 'billing.print': values }, 'Saved — printing test page')
    }
    printText(testPage(values.columns), values)
  }
  const choice = (v: 'direct' | 'browser', title: string, hint: string) => (
    <button type="button" aria-pressed={p.mode === v} onClick={() => set({ mode: v })} className={cn('flex-1 rounded-control border px-3 py-2 text-left', p.mode === v ? 'border-brand bg-brand-tint' : 'border-line hover:border-brand')}>
      <span className="block text-sm font-medium text-ink">{title}</span>
      <span className="block text-xs text-muted">{hint}</span>
    </button>
  )

  return (
    <Card title="Sales bills">
      <div className="flex flex-col gap-5">
        <Switch
          label="Clothing GST by price (HSN 61 / 62)"
          hint="5% when a piece costs ₹2,500 or less (before GST), 18% above. Off: the product's own GST rate is used."
          checked={settings['billing.apparelGstRule']}
          onChange={(v) => put({ 'billing.apparelGstRule': v }, 'Setting saved')}
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Bill printer</p>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            {choice('direct', 'Straight to the dot-matrix (recommended)', 'Dark, sharp, fast — like the old software. No print window.')}
            {choice('browser', 'Print window', 'Choose the printer each time (any printer)')}
          </div>
          {direct && (
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <Select
                label="Printer"
                required
                placeholder={printers.loading ? 'Looking for printers…' : 'Choose'}
                value={p.printer}
                onChange={(e) => set({ printer: e.target.value })}
                options={[...new Set([...(printers.data ?? []), ...(p.printer ? [p.printer] : [])])].map((n) => ({ value: n, label: n }))}
                hint={printers.error ? printers.error : 'The printer plugged into this PC (e.g. TVS MSP 250 Star)'}
              />
              <Input label="Blank lines after bill" type="number" inputMode="numeric" min={0} max={60} value={p.feedLines} onChange={(e) => set({ feedLines: e.target.value })} hint="When height is 0 — to reach the tear line" />
            </div>
          )}
          <p className="mb-3 text-xs text-muted">Paper: width / characters per line across. Height = one bill (tear line to tear line); 0 = no fixed size.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Width (inches)" type="number" inputMode="decimal" step="0.1" min={2} max={15} value={p.paperWidthIn} onChange={(e) => set({ paperWidthIn: e.target.value })} />
            <Input label="Height (inches)" type="number" inputMode="decimal" step="0.5" min={0} max={30} value={p.paperHeightIn} onChange={(e) => set({ paperHeightIn: e.target.value })} hint={direct ? 'Whole inches (6, 12 …)' : undefined} />
            <Input label="Characters per line" type="number" inputMode="numeric" min={32} max={136} value={p.columns} onChange={(e) => set({ columns: e.target.value })} hint="80 for 8 in, 136 for 15 in" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button icon={IconPrinter} onClick={test} loading={busy}>Test print</Button>
            <Button variant="primary" loading={busy} onClick={() => put({ 'billing.print': values }, 'Bill printer saved')}>Save</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
