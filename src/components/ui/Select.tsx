import { IconChevronDown } from '@tabler/icons-react'
import { useId, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { controlClass } from './controlClass'
import { Field } from './Field'

export type SelectOption = { value: string; label: string }

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

// Native select (best on phones) styled to match inputs.
export function Select({ label, hint, error, options, placeholder, className, id, ...rest }: Props) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <Field id={selectId} label={label} hint={hint} error={error} required={rest.required} className={className}>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={!!error}
          className={cn(controlClass(error), 'h-10 appearance-none pr-9')}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <IconChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
    </Field>
  )
}
