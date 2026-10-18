import { IconUserCheck, IconX } from '@tabler/icons-react'
import { Input } from '@/components/ui/Input'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { customerApi } from '../api/sales.api'
import { phoneDigits } from '../customerQuick'
import type { Customer } from '../types'

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

const Money = ({ c }: { c: Customer }) => (
  <>
    {c.balance > 0.004 && <span className="text-warn"> · owes {formatINR(c.balance)}</span>}
    {c.balance < -0.004 && <span className="text-success"> · advance {formatINR(-c.balance)}</span>}
  </>
)

// Customer on a bill / job: type name + phone. Saved customers that match show below — tap to use one.
// Nobody chosen → a new customer is saved with the bill (see customerQuick.ts).
export function CustomerQuickField({ value, onChange, name, phone, onName, onPhone, showErrors, phoneRequired = true }: Props) {
  const digits = phoneDigits(phone)
  // "+91 98470…" → search the last 10 digits (how the number is saved).
  const search = useDebounce(digits.length >= 4 ? digits.slice(-10) : name.trim().length >= 2 ? name.trim() : '', 250)
  const params = { search, status: 'active', page: 1, pageSize: 5 }
  const matches = useApiQuery(params, () => (search && !value ? customerApi.list(params) : Promise.resolve(null)))
  const items = matches.data?.items ?? []

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
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
        <Input label="Name" required={phoneRequired} value={name} onChange={(e) => onName(e.target.value)} placeholder={phoneRequired ? undefined : 'Optional for a shop bill'} error={showErrors && phoneRequired && !name.trim() ? 'Enter the name' : undefined} />
        <Input label="Phone" required={phoneRequired} inputMode="tel" value={phone} onChange={(e) => onPhone(e.target.value)} placeholder={phoneRequired ? undefined : 'Optional for a shop bill'}
          error={showErrors && (phoneRequired || digits.length > 0) && (digits.length < 10 || digits.length > 12) ? 'Enter a 10-digit phone' : undefined} />
      </div>
      {items.length > 0 && (
        <div className="rounded-control border border-line bg-card p-1">
          <p className="px-2 pt-1 text-xs text-muted">Saved customers</p>
          <ul>
            {items.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onChange(c)} className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm hover:bg-page">
                  <IconUserCheck size={16} className="shrink-0 text-brand" aria-hidden />
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="text-xs text-muted"> · {c.phone || 'no phone'} · {c.code}<Money c={c} /></span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
