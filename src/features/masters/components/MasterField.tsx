import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { productKindOptions } from '@/features/products/constants'
import type { FieldDef, MasterRow } from '../types'

type Props = {
  field: FieldDef
  value: string | boolean
  error?: string
  parents: MasterRow[]
  editingId?: number
  onChange: (value: string | boolean) => void
}

// Renders one master form field based on its type.
export function MasterField({ field, value, error, parents, editingId, onChange }: Props) {
  const common = {
    label: field.label,
    hint: field.hint,
    error,
    required: field.required,
    placeholder: field.placeholder,
  }

  switch (field.type) {
    case 'switch':
      return (
        <Switch label={field.label} hint={field.hint} checked={Boolean(value)} onChange={onChange} />
      )

    case 'textarea':
      return <Textarea {...common} value={String(value)} onChange={(e) => onChange(e.target.value)} />

    case 'number':
      return (
        <Input
          {...common}
          type="number"
          inputMode="decimal"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'parent':
      return (
        <Select
          {...common}
          placeholder="None — this is a main category"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          options={parents
            .filter((p) => p.id !== editingId)
            .map((p) => ({ value: String(p.id), label: p.name }))}
        />
      )

    case 'kind':
      return <Select {...common} placeholder="Choose" value={String(value)} onChange={(e) => onChange(e.target.value)} options={productKindOptions} />

    case 'colour': {
      const hex = String(value)
      return (
        <div className="flex items-end gap-3">
          <Input
            {...common}
            className="flex-1"
            placeholder="#7A1E3A"
            value={hex}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="color"
            aria-label="Pick colour"
            value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#ffffff'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="mb-[1px] h-10 w-12 cursor-pointer rounded-control border border-line bg-card p-1"
          />
        </div>
      )
    }

    default:
      return <Input {...common} value={String(value)} onChange={(e) => onChange(e.target.value)} />
  }
}
