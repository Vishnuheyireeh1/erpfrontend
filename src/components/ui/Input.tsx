import type { Icon } from '@tabler/icons-react'
import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { controlClass } from './controlClass'
import { Field } from './Field'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  icon?: Icon
}

export function Input({ label, hint, error, icon: Icon, className, id, ...rest }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={rest.required} className={className}>
      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          />
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(controlClass(error), 'h-10', Icon && 'pl-9')}
          {...rest}
        />
      </div>
    </Field>
  )
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, className, id, rows = 3, ...rest }: TextareaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={rest.required} className={className}>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={!!error}
        className={cn(controlClass(error), 'py-2')}
        {...rest}
      />
    </Field>
  )
}
