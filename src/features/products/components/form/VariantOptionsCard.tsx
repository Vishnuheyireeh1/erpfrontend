import { Card } from '@/components/ui/Card'
import { ChipSelect } from '@/components/ui/ChipSelect'
import { Switch } from '@/components/ui/Switch'
import { ColourSwatch } from '@/features/masters/components/ColourSwatch'
import type { ProductFormState } from '../../form/productForm'
import type { ProductOptions } from '../../hooks/useProductOptions'

type Props = {
  form: ProductFormState
  options: ProductOptions
  error?: string
  onHasVariants: (on: boolean) => void
  onToggle: (kind: 'sizeIds' | 'colourIds', id: number) => void
}

// "Comes in sizes / colours?" — picking chips creates one variant per size × colour.
export function VariantOptionsCard({ form, options, error, onHasVariants, onToggle }: Props) {
  const savedSizeIds = form.variants.filter((v) => v.id && v.sizeId).map((v) => v.sizeId!)
  const savedColourIds = form.variants.filter((v) => v.id && v.colourId).map((v) => v.colourId!)

  return (
    <Card title="Sizes and colours">
      <Switch
        label="This product comes in sizes or colours"
        hint="Each size / colour gets its own barcode, price and stock."
        checked={form.hasVariants}
        onChange={onHasVariants}
      />
      {form.hasVariants && (
        <div className="mt-5 flex flex-col gap-5">
          <ChipSelect
            label="Sizes"
            options={options.sizes.map((s) => ({ value: s.id, label: s.name }))}
            selected={form.sizeIds}
            locked={savedSizeIds}
            onToggle={(id) => onToggle('sizeIds', id)}
            emptyText="No sizes yet — add them in Masters."
          />
          <ChipSelect
            label="Colours"
            options={options.colours.map((c) => ({
              value: c.id,
              label: c.name,
              prefix: <ColourSwatch hex={c.hexCode} />,
            }))}
            selected={form.colourIds}
            locked={savedColourIds}
            onToggle={(id) => onToggle('colourIds', id)}
            emptyText="No colours yet — add them in Masters."
          />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </Card>
  )
}
