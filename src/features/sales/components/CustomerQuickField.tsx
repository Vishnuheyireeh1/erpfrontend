import { IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { customerApi } from '../api/sales.api'
import { phoneDigits } from '../customerQuick'
import type { Customer } from '../types'
import { CustomerPickList, Money } from './CustomerPickList'

type Props = {
  value: Customer | null
  onChange: (c: Customer | null) => void
  name: string
  phone: string
  onName: (v: string) => void
  onPhone: (v: string) => void
  showErrors?: boolean
  phoneRequired?: boolean // stitching → yes; shop bill → name alone is fine
}

const STEP = 8 // customers per "Show more"

// Customer on a bill / job: click the name or phone → saved customers drop down (latest first, scroll, "Show more").
// Typing narrows the list; no match → a new customer is saved with the bill (see customerQuick.ts).
export function CustomerQuickField({ value, onChange, name, phone, onName, onPhone, showErrors, phoneRequired = true }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [field, setField] = useState<'name' | 'phone'>('name')
  const [hi, setHi] = useState(-1)
  const digits = phoneDigits(phone)
  // The box being typed in drives the search; "+91 98470…" → the last 10 digits (how the number is saved).
  const term = useDebounce(field === 'phone' ? digits.slice(-10) : name.trim(), 250)
  const [more, setMore] = useState({ term: '', n: 1 })
  const n = more.term === term ? more.n : 1
  const params = { search: term || undefined, match: 'start' as const, status: 'active', sort: (term ? 'name' : 'recent') as 'name' | 'recent', page: 1, pageSize: STEP * n }
  const live = open && !value
  const q = useApiQuery([params, live], () => (live ? customerApi.list(params) : Promise.resolve(null)))
  const page = q.data ?? q.lastData
  const items = page?.items ?? []
  const hasMore = !!page && page.total > items.length

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  const pick = (c: Customer) => { onChange(c); setOpen(false); setHi(-1) }
  // The list opens on typing, ↓ or a click — not just because the cursor landed here (billing starts here).
  const focus = (f: 'name' | 'phone') => { setField(f); setOpen(true); setHi(-1) }
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (open) e.preventDefault() // closing the list — not "back" on the billing page
      return setOpen(false)
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setHi((h) => Math.max(0, Math.min(items.length - 1, h + (e.key === 'ArrowDown' ? 1 : -1))))
    } else if (e.key === 'Enter' && open && items[hi]) {
      e.preventDefault()
      pick(items[hi])
    }
  }

  if (value) {
    return (
      <div className="flex min-h-11 items-center gap-3 rounded-control border border-line bg-page px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{value.name} <span className="font-normal text-muted">· {value.code}</span></p>
          <p className="truncate text-xs text-muted">{value.phone || 'No phone'}<Money c={value} /></p>
        </div>
        <button type="button" onClick={() => onChange(null)} aria-label="Change customer" className="flex shrink-0 items-center gap-1 rounded-control px-2 py-1.5 text-sm text-muted hover:bg-card hover:text-ink">
          <IconX size={16} /> Change
        </button>
      </div>
    )
  }

  return (
    <div ref={box} className="relative">
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <Input label="Customer name" required={phoneRequired} value={name} autoComplete="off" placeholder="Type the name or pick a saved customer" data-hotkey="customer-name" onFocus={() => setField('name')} onClick={() => focus('name')} onBlur={() => setOpen(false)} onKeyDown={keys}
          onChange={(e) => { onName(e.target.value); focus('name') }} error={showErrors && phoneRequired && !name.trim() ? 'Enter the name' : undefined} />
        <Input label="Customer phone" required={phoneRequired} inputMode="tel" value={phone} autoComplete="off" placeholder="10-digit mobile number" data-hotkey="customer-phone" onFocus={() => setField('phone')} onClick={() => focus('phone')} onBlur={() => setOpen(false)} onKeyDown={keys}
          onChange={(e) => { onPhone(e.target.value); focus('phone') }}
          error={showErrors && (phoneRequired || digits.length > 0) && (digits.length < 10 || digits.length > 12) ? 'Enter a 10-digit phone' : undefined} />
      </div>
      {open && (
        <CustomerPickList items={items} loading={!page} searching={!!term} hasMore={hasMore} moreLoading={q.loading && !!page} highlight={hi}
          onPick={pick} onMore={() => setMore({ term, n: n + 1 })} />
      )}
    </div>
  )
}
