import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ChipSelect } from '@/components/ui/ChipSelect'
import { Spinner } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { inventoryApi } from '@/features/inventory/api/inventory.api'
import type { StockItem } from '@/features/inventory/types'
import { productsApi } from '@/features/products/api/products.api'
import { productTypeOptions } from '@/features/products/constants'
import { categoryOptions, useProductOptions } from '@/features/products/hooks/useProductOptions'
import { ApiError } from '@/lib/api'

type Props = { initialName?: string; onClose: () => void; onCreated: (lines: { item: StockItem; qty: string }[]) => void }

const toggle = (list: number[], v: number) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
const key = (c: { sizeId: number | null; colourId: number | null }) => `${c.sizeId ?? 0}-${c.colourId ?? 0}`
type Opt = { id: number; name: string }

// Quantity received — sits right after Unit: one box, or (sizes / colours picked) one box per size / colour.
function QtyBoxes({ sizes, colours, unit, qty, onQty }: { sizes: Opt[]; colours: Opt[]; unit: string; qty: Record<string, string>; onQty: (k: string, v: string) => void }) {
  const combos = (sizes.length ? sizes : [null]).flatMap((s) => (colours.length ? colours : [null]).map((c) => ({ s, c })))
  const box = (k: string, label: string) => (
    <Input key={k} label={label} required type="number" inputMode="decimal" min={0} value={qty[k] ?? ''} onChange={(e) => onQty(k, e.target.value)} placeholder="0" />
  )
  if (combos.length === 1) return box('0-0', `Quantity${unit ? ` (${unit})` : ''}`)
  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 text-sm font-medium text-ink">Quantity{unit ? ` (${unit})` : ''} <span className="text-danger">*</span></p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {combos.map(({ s, c }) => box(key({ sizeId: s?.id ?? null, colourId: c?.id ?? null }), [s?.name, c?.name].filter(Boolean).join(' · ')))}
      </div>
    </div>
  )
}

// New design straight from the supplier bill: what the item is (name, unit, prices, sizes) AND how many came —
// creates the product (barcodes made by the ERP) and puts it on the bill with that quantity.
export function QuickProductModal({ initialName = '', onClose, onCreated }: Props) {
  const toast = useToast()
  const { options, ready } = useProductOptions()
  const [f, setF] = useState({ name: initialName, type: 'READY_MADE', categoryId: '', unitId: '', taxRateId: '', hsnCode: '', purchasePrice: '', sellingPrice: '', mrp: '' })
  const [sizes, setSizes] = useState<number[]>([])
  const [colours, setColours] = useState<number[]>([])
  const [qty, setQty] = useState<Record<string, string>>({}) // per size / colour ("0-0" when none)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f, v: string) => { setF((x) => ({ ...x, [k]: v })); setError('') }

  const save = async () => {
    if (!f.name.trim()) return setError('Enter the item name')
    if (!f.categoryId || !f.unitId) return setError('Choose the category and unit')
    if (!(Number(f.sellingPrice) > 0)) return setError('Enter the selling price')
    // Every size × colour picked = one variant (none picked = a single variant).
    const combos = (sizes.length ? sizes : [null]).flatMap((s) => (colours.length ? colours : [null]).map((c) => ({ sizeId: s, colourId: c })))
    if (combos.some((c) => !(Number(qty[key(c)]) > 0))) return setError(combos.length > 1 ? 'Enter how many came for each size / colour' : 'Enter how many came')
    setSaving(true)
    try {
      const product = await productsApi.create({
        name: f.name.trim(), type: f.type, categoryId: Number(f.categoryId), unitId: Number(f.unitId),
        taxRateId: f.taxRateId ? Number(f.taxRateId) : null, hsnCode: f.hsnCode.trim() || null,
        variants: combos.map((c) => ({ ...c, purchasePrice: Number(f.purchasePrice) || 0, sellingPrice: Number(f.sellingPrice), mrp: f.mrp ? Number(f.mrp) : null })),
      })
      const stock = await inventoryApi.list({ search: product.code, status: 'all', page: 1, pageSize: 100 })
      toast.success(`${product.code} ${product.name} created with ${combos.length} barcode(s)`)
      // Match each new barcode to its size / colour → the quantity typed here.
      const sizeId = (n?: string) => options.sizes.find((s) => s.name === n)?.id ?? null
      const colourId = (n?: string) => options.colours.find((c) => c.name === n)?.id ?? null
      onCreated(stock.items.filter((i) => i.product.code === product.code).map((i) => ({ item: i, qty: qty[key({ sizeId: sizeId(i.size?.name), colourId: colourId(i.colour?.name) })] || '1' })))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the item')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="New item from this bill"
      description="A new design from this supplier: what it is, and how many came. Barcodes are made automatically."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Create and add to bill</Button></>}
    >
      {!ready ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Item name" required value={f.name} onChange={(e) => set('name', e.target.value)} className="sm:col-span-2" autoFocus />
            <Select label="Type" value={f.type} onChange={(e) => set('type', e.target.value)} options={productTypeOptions} />
            <Select label="Category" required placeholder="Choose" value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)} options={categoryOptions(options.categories)} />
            <Select label="Unit" required placeholder="Choose" value={f.unitId} onChange={(e) => set('unitId', e.target.value)} options={options.units.map((u) => ({ value: String(u.id), label: `${u.name} (${u.code})` }))} />
            <QtyBoxes sizes={options.sizes.filter((s) => sizes.includes(s.id))} colours={options.colours.filter((c) => colours.includes(c.id))} unit={options.units.find((u) => String(u.id) === f.unitId)?.code ?? ''} qty={qty} onQty={(k, v) => { setQty((q) => ({ ...q, [k]: v })); setError('') }} />
            <Select label="GST %" placeholder="None" value={f.taxRateId} onChange={(e) => set('taxRateId', e.target.value)} options={options.taxRates.map((t) => ({ value: String(t.id), label: `${Number(t.rate)}%` }))} />
            <Input label="HSN code" inputMode="numeric" value={f.hsnCode} onChange={(e) => set('hsnCode', e.target.value.replace(/\D/g, ''))} placeholder="5208" />
            <Input label="Purchase rate ₹" type="number" inputMode="decimal" min={0} value={f.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} hint="As on the supplier bill" />
            <Input label="Selling price ₹" required type="number" inputMode="decimal" min={0} value={f.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} hint="GST included" />
            <Input label="MRP ₹" type="number" inputMode="decimal" min={0} value={f.mrp} onChange={(e) => set('mrp', e.target.value)} />
          </div>
          <ChipSelect label="Sizes (optional)" options={options.sizes.map((s) => ({ value: s.id, label: s.name }))} selected={sizes} onToggle={(v) => setSizes((l) => toggle(l, v))} emptyText="No sizes in Masters" />
          <ChipSelect
            label="Colours (optional)"
            options={options.colours.map((c) => ({ value: c.id, label: c.name, prefix: c.hexCode ? <span className="h-3 w-3 rounded-full border border-line" style={{ background: c.hexCode }} /> : undefined }))}
            selected={colours}
            onToggle={(v) => setColours((l) => toggle(l, v))}
            emptyText="No colours in Masters"
          />
          {error && <p role="alert" className="rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
        </div>
      )}
    </Modal>
  )
}
