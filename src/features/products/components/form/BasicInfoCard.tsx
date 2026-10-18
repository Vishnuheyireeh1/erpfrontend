import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { productTypeMeta, productTypeOptions } from '../../constants'
import type { FormErrors, ProductFormState } from '../../form/productForm'
import { categoryOptions, type ProductOptions } from '../../hooks/useProductOptions'

type Props = {
  form: ProductFormState
  errors: FormErrors
  options: ProductOptions
  set: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
}

const toOptions = (items: { id: number; name: string }[]) =>
  items.map((i) => ({ value: String(i.id), label: i.name }))

// Name, type, category, unit, GST … the product-level details.
export function BasicInfoCard({ form, errors, options, set }: Props) {
  const typeHint = form.type ? productTypeMeta[form.type].hint : 'What kind of item is this?'

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
        <Select
          label="Product type"
          required
          placeholder="Choose type"
          options={productTypeOptions}
          value={form.type}
          onChange={(e) => set('type', e.target.value as ProductFormState['type'])}
          error={errors.type}
          hint={typeHint}
        />
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
          label="Brand"
          placeholder="No brand"
          options={toOptions(options.brands)}
          value={form.brandId}
          onChange={(e) => set('brandId', e.target.value)}
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
    </Card>
  )
}
