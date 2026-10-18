import { IconPrinter, IconTrash } from '@tabler/icons-react'
import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { ItemPicker } from '@/features/inventory/components/ItemPicker'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import type { StockItem } from '@/features/inventory/types'
import type { QueueEntry } from '../hooks/useLabelSeed'
import { fitReceipt, labelLayouts, layoutById, MAX_LABELS, paginate, perPage } from '../layouts'
import { LabelPreview } from './LabelPreview'
import { PrintRoot } from './LabelPages'
import { LabelQueue } from './LabelQueue'
import type { LabelOptions, PriceMode } from './LabelView'

const PREFS_KEY = 'sairandhri.labelPrefs'
type Prefs = { layoutId: string; priceMode: PriceMode; showShop: boolean }
const DEFAULT_PREFS: Prefs = { layoutId: 'roll-50x25', priceMode: 'mrp', showShop: true }

// Per-computer convenience only (which printer this PC uses) — safe if storage is unavailable.
function readPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }
  } catch {
    return DEFAULT_PREFS
  }
}
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p))
  } catch {
    // ignore — preference just isn't remembered
  }
}

const priceOptions = [
  { value: 'mrp', label: 'MRP (selling price if no MRP)' },
  { value: 'selling', label: 'Selling price' },
  { value: 'none', label: 'No price' },
]

export function LabelWorkbench({ initial }: { initial: QueueEntry[] }) {
  const [entries, setEntries] = useState<QueueEntry[]>(initial)
  const [prefs, setPrefs] = useState<Prefs>(readPrefs)
  const [skip, setSkip] = useState(0)
  const [printing, setPrinting] = useState(false)

  const { profile } = useBusinessProfile()
  const chosen = layoutById(prefs.layoutId)
  // Short shop name for the sticker (first word of the profile name, e.g. "Sairandhri").
  const shopName = (profile?.shopName ?? 'Sairandhri').split(' ')[0]
  const options: LabelOptions = { shopName, showShop: prefs.showShop, priceMode: prefs.priceMode }
  const updatePrefs = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    savePrefs(next)
  }

  const labels = useMemo(() => entries.flatMap((e) => Array<StockItem>(e.qty).fill(e.item)), [entries])
  const layout = useMemo(() => fitReceipt(chosen, labels.length), [chosen, labels.length])
  const safeSkip = layout.sheet ? Math.min(Math.max(0, skip), perPage(layout) - 1) : 0
  const pages = useMemo(() => paginate(labels, layout, safeSkip), [labels, layout, safeSkip])
  const tooMany = labels.length > MAX_LABELS

  // Scanning the same item again adds one more label.
  const add = (item: StockItem) =>
    setEntries((es) => (es.some((e) => e.item.id === item.id) ? es.map((e) => (e.item.id === item.id ? { ...e, qty: e.qty + 1 } : e)) : [...es, { item, qty: 1 }]))
  const setQty = (id: number, qty: number) => setEntries((es) => es.map((e) => (e.item.id === id ? { ...e, qty } : e)))
  const remove = (id: number) => setEntries((es) => es.filter((e) => e.item.id !== id))
  const donePrinting = useCallback(() => setPrinting(false), [])

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card
          title={`Items (${entries.length})`}
          bodyClassName="p-0"
          actions={entries.length > 0 && <Button size="sm" variant="ghost" icon={IconTrash} onClick={() => setEntries([])}>Clear</Button>}
        >
          <div className="border-b border-line p-4">
            <ItemPicker onPick={add} placeholder="Scan or search items to print labels for" />
          </div>
          {entries.length === 0 ? (
            <EmptyState title="Add items to print" description="Scan or search above, or use “Print labels” from a product, stock item or stock document." />
          ) : (
            <LabelQueue entries={entries} onQty={setQty} onRemove={remove} />
          )}
        </Card>

        <Card title="Label settings">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Printer / paper"
              className="sm:col-span-2"
              value={layout.id}
              onChange={(e) => updatePrefs({ layoutId: e.target.value })}
              options={labelLayouts.map((l) => ({ value: l.id, label: l.name }))}
              hint={layout.hint}
            />
            <Select label="Price on label" value={prefs.priceMode} onChange={(e) => updatePrefs({ priceMode: e.target.value as PriceMode })} options={priceOptions} />
            {layout.sheet ? (
              <Input
                label="Skip used labels"
                type="number"
                min={0}
                max={perPage(layout) - 1}
                value={skip}
                onChange={(e) => setSkip(Math.floor(Number(e.target.value) || 0))}
                hint="For a part-used sheet: start after this many labels"
              />
            ) : (
              <div />
            )}
            <div className="sm:col-span-2">
              <Switch label="Print shop name" checked={prefs.showShop} onChange={(v) => updatePrefs({ showShop: v })} />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Card title="Preview">
          <LabelPreview pages={pages} layout={layout} options={options} />
        </Card>
        <div className="flex flex-col gap-2 rounded-card border border-line bg-card p-4">
          <p className="text-sm text-ink">
            <span className="font-semibold">{labels.length.toLocaleString('en-IN')} labels</span>
            <span className="text-muted">
              {' '}· {layout.receipt ? `about ${Math.round(layout.page.height * pages.length)} mm of receipt paper` : `${pages.length.toLocaleString('en-IN')} ${layout.sheet ? `A4 sheet${pages.length === 1 ? '' : 's'}` : `row${pages.length === 1 ? '' : 's'} on the roll`}`}
            </span>
          </p>
          {tooMany && <p className="text-xs text-danger">Print at most {MAX_LABELS.toLocaleString('en-IN')} labels at a time.</p>}
          <p className="text-xs text-muted">In the print window: choose the printer (e.g. “POS80 Printer”), More settings → Margins “None”, Scale “Default”, and untick “Headers and footers” (else the date and web address print too).</p>
          <Button variant="primary" size="lg" icon={IconPrinter} disabled={labels.length === 0 || tooMany} onClick={() => setPrinting(true)}>
            Print labels
          </Button>
        </div>
      </div>

      {printing && <PrintRoot pages={pages} layout={layout} options={options} onDone={donePrinting} />}
    </div>
  )
}
