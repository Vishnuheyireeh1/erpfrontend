import { IconPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { productTypeMeta } from '../../constants'
import type { FormErrors, ProductFormState } from '../../form/productForm'
import { categoryOptions, type ProductOptions } from '../../hooks/useProductOptions'
import type { Option } from '../../types'
import { ProductTypeModal } from './ProductTypeModal'

type Props = {
  form: ProductFormState
  errors: FormErrors
  options: ProductOptions
  set: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
  onTypeAdded: (type: Option) => void
}

const toOptions = (items: { id: number; name: string }[]) =>
  items.map((i) => ({ value: String(i.id), label: i.name }))

// Name, type, category, unit, GST … the product-level details.
export function BasicInfoCard({ form, errors, options, set, onTypeAdded }: Props) {
  const [adding, setAdding] = useState(false)
  const typeHint = form.type ? productTypeMeta[form.type].hint : 'What kind of item is this?'
  const types = options.productTypes // active types (Masters → Product types)
  const pickType = (id: string) => {
    set('productTypeId', id)
    set('type', options.productTypes.find((t) => String(t.id) === id)?.kind ?? '')
  }
  // Opened as "Add own-made product" (?type=FINISHED) → the first type that works like it.
  useEffect(() => {
    if (form.productTypeId || !form.type) return
    const first = options.productTypes.find((t) => t.kind === form.type)
    if (first) set('productTypeId', String(first.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once the types load
  }, [options.productTypes])

  return (
    <Card title="Product details">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Product name"
          required
          placeholder="Anarkali party kurti"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          className="sm:col-span-2"
        />
        <div>
          <Select
            label="Product type"
            required
            placeholder="Choose type"
            options={types.map((t) => ({ value: String(t.id), label: t.name }))}
            value={form.productTypeId}
            onChange={(e) => pickType(e.target.value)}
            error={errors.productTypeId}
            hint={typeHint}
          />
          <button type="button" onClick={() => setAdding(true)} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            <IconPlus size={14} /> New type
          </button>
        </div>
        <Select
          label="Category"
          required
          placeholder="Choose category"
          options={categoryOptions(options.categories)}
          value={form.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
          error={errors.categoryId}
        />
        <Select
          label="Unit"
          required
          placeholder="Choose unit"
          options={options.units.map((u) => ({ value: String(u.id), label: `${u.name} (${u.code})` }))}
          value={form.unitId}
          onChange={(e) => set('unitId', e.target.value)}
          error={errors.unitId}
          hint="How it's counted when bought and sold"
        />
        <Select
          label="GST rate"
          placeholder="Not set"
          options={toOptions(options.taxRates)}
          value={form.taxRateId}
          onChange={(e) => set('taxRateId', e.target.value)}
        />
        <Input
          label="HSN code"
          inputMode="numeric"
          placeholder="6204"
          maxLength={8}
          value={form.hsnCode}
          onChange={(e) => set('hsnCode', e.target.value.replace(/\D/g, ''))}
          error={errors.hsnCode}
          hint="Printed on GST invoices"
        />
        <Input
          label="Fabric / material"
          placeholder="Georgette"
          value={form.fabric}
          onChange={(e) => set('fabric', e.target.value)}
          className="sm:col-span-2"
        />
        <Textarea
          label="Notes"
          placeholder="Design details, care instructions …"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <Switch
            label="Active"
            hint="Inactive products are hidden from billing but keep their history."
            checked={form.isActive}
            onChange={(v) => set('isActive', v)}
          />
        </div>
      </div>
      {adding && <ProductTypeModal onClose={() => setAdding(false)} onCreated={(t) => { onTypeAdded(t); set('productTypeId', String(t.id)); set('type', t.kind ?? ''); setAdding(false) }} />}
    </Card>
  )
}
