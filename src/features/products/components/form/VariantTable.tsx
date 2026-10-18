import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { controlClass } from '@/components/ui/controlClass'
import { cn } from '@/lib/cn'
import type { FormErrors, VariantRow } from '../../form/productForm'
import type { Option } from '../../types'
import { VariantRowEditor, variantGridClass } from './VariantRowEditor'

type Props = {
  rows: VariantRow[]
  sizes: Option[]
  colours: Option[]
  errors: FormErrors
  decimalStock: boolean
  onRowChange: (key: string, patch: Partial<VariantRow>) => void
  onApplyAll: (patch: Partial<VariantRow>) => void
}

type Bulk = { purchasePrice: string; sellingPrice: string; mrp: string; minStock: string }
const EMPTY_BULK: Bulk = { purchasePrice: '', sellingPrice: '', mrp: '', minStock: '' }

// Prices / barcode / low-stock level per variant, with "apply to all" for many variants.
export function VariantTable({ rows, sizes, colours, errors, decimalStock, onRowChange, onApplyAll }: Props) {
  const [bulk, setBulk] = useState<Bulk>(EMPTY_BULK)

  const applyAll = () => {
    const patch = Object.fromEntries(Object.entries(bulk).filter(([, v]) => v !== '')) as Partial<VariantRow>
    if (Object.keys(patch).length === 0) return
    onApplyAll(patch)
    setBulk(EMPTY_BULK)
  }

  const bulkInput = (field: keyof Bulk, label: string) => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={bulk[field]}
        onChange={(e) => setBulk((b) => ({ ...b, [field]: e.target.value }))}
        className={cn(controlClass(), 'h-9')}
      />
    </label>
  )

  return (
    <Card
      title={rows.length > 1 ? `Variants (${rows.length})` : 'Price and barcode'}
      bodyClassName="p-0"
    >
      {rows.length > 1 && (
        <div className="grid grid-cols-2 items-end gap-3 border-b border-line bg-page px-4 py-3 sm:grid-cols-5">
          {bulkInput('purchasePrice', 'Purchase ₹ (all)')}
          {bulkInput('sellingPrice', 'Selling ₹ (all)')}
          {bulkInput('mrp', 'MRP ₹ (all)')}
          {bulkInput('minStock', 'Low-stock alert (all)')}
          <Button size="sm" onClick={applyAll} className="col-span-2 h-9 sm:col-span-1">
            Apply to all
          </Button>
        </div>
      )}

      <div className={cn(variantGridClass, 'hidden px-4 py-2 text-xs font-medium text-muted lg:grid')}>
        <span>Variant / SKU</span>
        <span>Purchase ₹</span>
        <span>Selling ₹ *</span>
        <span>MRP ₹</span>
        <span>Low-stock alert</span>
        <span>Barcode</span>
        <span className="text-center">Active</span>
      </div>

      <div className="divide-y divide-line lg:divide-y-0">
        {rows.map((row) => (
          <VariantRowEditor
            key={row.key}
            row={row}
            sizes={sizes}
            colours={colours}
            errors={errors}
            decimalStock={decimalStock}
            onChange={(patch) => onRowChange(row.key, patch)}
          />
        ))}
      </div>

      <p className="border-t border-line px-4 py-3 text-xs text-muted">
        Leave the barcode empty and the ERP creates one. Type the supplier's barcode to keep theirs.
        Current stock comes from the Inventory module.
      </p>
    </Card>
  )
}
