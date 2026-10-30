import { IconChevronDown } from '@tabler/icons-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
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
  compact?: boolean // h-9 inside rows (payment mode …)
}

// Phones / tablets keep the native list (best with a finger).
const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

// Dropdown used across the app. Laptop / desktop: a "type or pick" box — the list opens when the cursor reaches it,
// typing narrows it, ↑ ↓ move, Enter picks (then the billing page moves on), Esc closes. Phones: the native select.
// Callers keep using onChange={(e) => e.target.value}.
export function Select(props: Props) {
  return touch ? <NativeSelect {...props} /> : <ComboSelect {...props} />
}

function NativeSelect({ label, hint, error, options, placeholder, className, id, compact, ...rest }: Props) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <Field id={selectId} label={label} hint={hint} error={error} required={rest.required} className={className}>
      <div className="relative">
        <select id={selectId} aria-invalid={!!error} className={cn(controlClass(error), compact ? 'h-9' : 'h-10', 'appearance-none pr-9')} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <IconChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    </Field>
  )
}

function ComboSelect({ label, hint, error, options, placeholder, className, id, compact, value, onChange, onKeyDown, onFocus, onBlur, disabled, required, ...rest }: Props) {
  const autoId = useId()
  const inputId = id ?? autoId
  const listId = `${inputId}-list`
  const input = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null) // null = showing the chosen one
  const [hi, setHi] = useState(0)
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0, up: false })

  const all = placeholder ? [{ value: '', label: placeholder }, ...options] : options
  const current = String(value ?? '')
  const chosen = all.find((o) => o.value === current)
  const term = (query ?? '').trim().toLowerCase()
  // Typed text narrows the list: names starting with it first, then the ones containing it.
  const list = !term ? all : [...all.filter((o) => o.label.toLowerCase().startsWith(term)), ...all.filter((o) => !o.label.toLowerCase().startsWith(term) && o.label.toLowerCase().includes(term))]

  const place = () => {
    const r = input.current?.getBoundingClientRect()
    if (!r) return
    const up = window.innerHeight - r.bottom < 240 && r.top > 260
    setPos({ left: r.left, top: up ? r.top : r.bottom, width: r.width, up })
  }
  useLayoutEffect(() => { if (open) place() }, [open])
  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place) }
  }, [open])
  // Keep the highlighted row in view while moving with ↑ ↓.
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' }) }, [hi, open])

  const openList = () => {
    setQuery(null)
    setHi(Math.max(0, all.findIndex((o) => o.value === current)))
    setOpen(true)
  }
  const close = () => { setOpen(false); setQuery(null) }
  const pick = (o: SelectOption) => {
    close()
    if (o.value !== current) onChange?.({ target: { value: o.value }, currentTarget: { value: o.value } } as unknown as ChangeEvent<HTMLSelectElement>)
  }

  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e as unknown as KeyboardEvent<HTMLSelectElement>)
    if (e.defaultPrevented) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return openList()
      setHi((h) => Math.max(0, Math.min(list.length - 1, h + (e.key === 'ArrowDown' ? 1 : -1))))
    } else if (e.key === 'Enter') {
      // Picks and lets Enter carry on (the billing page moves to the next box).
      if (open && list[hi]) pick(list[hi])
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') close()
  }

  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        <input
          ref={input}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={!!error}
          aria-required={required}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder ?? 'Choose'}
          // An 'All types'-style option with an empty value still shows its name; only the placeholder stays blank.
          value={query ?? (chosen && !(placeholder && chosen.value === '') ? chosen.label : '')}
          onFocus={(e) => { openList(); e.currentTarget.select(); onFocus?.(e as unknown as FocusEvent<HTMLSelectElement>) }}
          onClick={() => !open && openList()}
          onBlur={(e) => { close(); onBlur?.(e as unknown as FocusEvent<HTMLSelectElement>) }}
          onChange={(e) => { setQuery(e.target.value); setHi(0); setOpen(true) }}
          onKeyDown={keys}
          className={cn(controlClass(error), compact ? 'h-9' : 'h-10', 'cursor-pointer pr-9 disabled:cursor-not-allowed')}
          {...(rest as Record<string, unknown>)}
        />
        <IconChevronDown size={16} className={cn('pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </div>
      {open && createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()} // keep the cursor in the box
          style={{ left: pos.left, width: Math.max(pos.width, 180), ...(pos.up ? { bottom: window.innerHeight - pos.top + 4 } : { top: pos.top + 4 }) }}
          className="fixed z-[80] max-h-64 overflow-y-auto rounded-control border border-line bg-card p-1 shadow-lg"
        >
          {list.length === 0 && <li className="px-3 py-2 text-sm text-muted">No match</li>}
          {list.map((o, i) => (
            <li key={o.value || '__none'} role="option" aria-selected={o.value === current} data-i={i}>
              <button type="button" tabIndex={-1} onClick={() => pick(o)} onMouseEnter={() => setHi(i)}
                className={cn('w-full rounded-control px-3 py-1.5 text-left text-sm', i === hi ? 'bg-page' : '', o.value === current ? 'font-medium text-brand' : o.value === '' ? 'text-muted' : 'text-ink')}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </Field>
  )
}
