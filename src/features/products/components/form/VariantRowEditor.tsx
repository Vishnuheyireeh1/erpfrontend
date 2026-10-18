import { controlClass } from '@/components/ui/controlClass'
import { Switch } from '@/components/ui/Switch'
import { ColourSwatch } from '@/features/masters/components/ColourSwatch'
import { cn } from '@/lib/cn'
import type { FormErrors, VariantRow } from '../../form/productForm'
import type { Option } from '../../types'

type Props = {
  row: VariantRow
  sizes: Option[]
  colours: Option[]
  errors: FormErrors
  decimalStock: boolean
  onChange: (patch: Partial<VariantRow>) => void
}

// Shared grid: a table row on laptop+, a card with labelled fields on phone / tablet.
export const variantGridClass =
  'grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))_minmax(0,1.3fr)_64px] lg:items-center lg:gap-2'

function Cell({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-xs text-muted lg:sr-only">{label}</span>
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  )
}

export function VariantRowEditor({ row, sizes, colours, errors, decimalStock, onChange }: Props) {
  const size = sizes.find((s) => s.id === row.sizeId)
  const colour = colours.find((c) => c.id === row.colourId)
  const title = [size?.name, colour?.name].filter(Boolean).join(' · ') || 'Standard'
  const input = (error?: string) => cn(controlClass(error), 'h-9')
  const money = (field: 'purchasePrice' | 'sellingPrice' | 'mrp') => ({
    type: 'number',
    inputMode: 'decimal' as const,
    min: 0,
    step: '0.01',
    value: row[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [field]: e.target.value }),
  })

  return (
    <div className={cn(variantGridClass, 'border-t border-line px-4 py-3 first:border-t-0', !row.isActive && 'opacity-60')}>
      <div className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-4 lg:col-span-1">
        {row.colourId && <ColourSwatch hex={colour?.hexCode} />}
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{title}</p>
          <p className="truncate text-xs text-muted">
            {row.sku ?? 'SKU on save'}
            {row.stockQty !== undefined && <> · In stock {Number(row.stockQty).toLocaleString('en-IN', { maximumFractionDigits: 3 })}</>}
          </p>
        </div>
      </div>
      <Cell label="Purchase ₹" error={errors[`${row.key}.purchasePrice`]}>
        <input {...money('purchasePrice')} placeholder="0" className={input(errors[`${row.key}.purchasePrice`])} />
      </Cell>
      <Cell label="Selling ₹ *" error={errors[`${row.key}.sellingPrice`]}>
        <input {...money('sellingPrice')} placeholder="0" className={input(errors[`${row.key}.sellingPrice`])} />
      </Cell>
      <Cell label="MRP ₹" error={errors[`${row.key}.mrp`]}>
        <input {...money('mrp')} placeholder="—" className={input(errors[`${row.key}.mrp`])} />
      </Cell>
      <Cell label="Low-stock alert">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={decimalStock ? '0.001' : '1'}
          value={row.minStock}
          onChange={(e) => onChange({ minStock: e.target.value })}
          className={input()}
        />
      </Cell>
      <Cell label="Barcode" className="col-span-2 sm:col-span-3 lg:col-span-1">
        <input
          value={row.barcode}
          maxLength={30}
          placeholder="Auto-generate"
          onChange={(e) => onChange({ barcode: e.target.value.replace(/[^A-Za-z0-9-]/g, '') })}
          className={cn(input(), 'font-mono text-xs')}
        />
      </Cell>
      <div className="col-span-2 sm:col-span-1 lg:flex lg:justify-center">
        <div className="lg:hidden">
          <Switch label="Active" checked={row.isActive} onChange={(v) => onChange({ isActive: v })} />
        </div>
        <input
          type="checkbox"
          aria-label={`${title} active`}
          checked={row.isActive}
          onChange={(e) => onChange({ isActive: e.target.checked })}
          className="hidden size-4 accent-brand lg:block"
        />
      </div>
    </div>
  )
}
