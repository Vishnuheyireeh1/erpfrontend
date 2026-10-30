import { IconX } from '@tabler/icons-react'
import { useEffect, useRef, type KeyboardEvent, type Ref } from 'react'
import { controlClass } from '@/components/ui/controlClass'
import { itemTitle, qtyText } from '@/features/inventory/constants'
import type { StockItem } from '@/features/inventory/types'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { unitWord } from '../units'

// included = shop material used for the stitching on this bill (not charged); only when the bill has stitching.
// discAmt = a ₹ discount as typed (kept so the box shows it; the bill keeps the %). discMode = which one the line box takes.
export type SaleLineDraft = { key: string; item: StockItem; qty: string; rate: string; discountPct: string; focus?: boolean; included?: boolean; discAmt?: string; discMode?: 'pct' | 'amt' }

// ₹ discount → % of qty × rate (the bill stores the %).
function pctFromAmt(amt: string, qty: string, rate: string) {
  const gross = (Number(qty) || 0) * (Number(rate) || 0)
  const pct = gross > 0 ? Math.round(((Number(amt) || 0) / gross) * 1_000_000) / 10_000 : 0
  return amt === '' || !pct ? '' : String(Math.min(100, pct))
}
const r2 = (n: number) => Math.round(n * 100) / 100

// Grid shared with the header row on the billing page: table row on laptop+, card on phone.
export const saleGridClass =
  'grid grid-cols-3 gap-3 @2xl:grid-cols-[minmax(0,1fr)_88px_100px_118px_40px_92px_28px] @2xl:items-center @2xl:gap-2'

type Props = { line: SaleLineDraft; amount: number; gstRate: number; error?: string; stitching?: boolean; onChange: (patch: Partial<SaleLineDraft>) => void; onRemove: () => void }

// One bill line. The quantity box shows the item's own unit (m for fabric, pc for garments),
// and a metre item gets the cursor straight away so staff type how many metres the customer wants.
export function SaleLineRow({ line, amount, gstRate, error, stitching, onChange, onRemove }: Props) {
  const { item } = line
  const unit = item.product.unit.code
  const decimal = item.product.unit.allowDecimal
  const qtyRef = useRef<HTMLInputElement>(null)
  // Newly added (or picked again) metre item → cursor into its quantity box,
  // unless the item list is still open (keyboard picking several — Esc then comes to the empty metres).
  useEffect(() => {
    if (line.focus && document.activeElement?.getAttribute('aria-expanded') !== 'true') qtyRef.current?.focus()
  }, [line.focus])
  const amtMode = line.discMode === 'amt'
  // Qty / rate changed while a ₹ discount is set → keep the ₹, re-work the %.
  const change = (key: 'qty' | 'rate', v: string) => {
    const next = { ...line, [key]: v }
    const keepAmt = amtMode && line.discAmt ? { discountPct: pctFromAmt(line.discAmt, next.qty, next.rate) } : {}
    onChange(key === 'qty' ? { qty: v, focus: false, ...keepAmt } : { rate: v, ...keepAmt })
  }
  // Enter → the next metre box still empty, else back to the item search.
  const backToSearch = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const self = e.currentTarget
    const next = [...document.querySelectorAll<HTMLInputElement>('input[data-need-qty]')].find((el) => el !== self)
    const target = next ?? document.querySelector<HTMLInputElement>('input[aria-label="Find item"]')
    if (!target) return
    e.preventDefault()
    target.focus()
  }
  const shownAmt = line.discAmt ?? (Number(line.discountPct) ? String(r2(((Number(line.qty) || 0) * (Number(line.rate) || 0) * Number(line.discountPct)) / 100)) : '')
  const setMode = (m: 'pct' | 'amt') => onChange(m === 'amt' ? { discMode: m, discAmt: shownAmt } : { discMode: m, discAmt: undefined })
  const field = (label: string, key: 'qty' | 'rate', suffix?: string, props: { step?: string; max?: number; placeholder?: string; ref?: Ref<HTMLInputElement> } = {}) => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted @2xl:sr-only">{label}</span>
      <span className="relative block">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          {...props}
          aria-label={label}
          value={line[key]}
          onChange={(e) => change(key, e.target.value)}
          onFocus={(e) => e.target.select()}
          // Qty / metres typed + Enter → back to the item search for the next item (rate: → arrow).
          onKeyDown={key === 'qty' ? backToSearch : undefined}
          data-need-qty={key === 'qty' && decimal && !(Number(line.qty) > 0) ? '' : undefined}
          className={cn(controlClass(error), 'h-9', suffix && 'pr-9')}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted">{suffix}</span>}
      </span>
    </label>
  )

  return (
    <div className={cn(saleGridClass, 'relative border-t border-line px-4 py-3 first:border-t-0')}>
      <div className="col-span-3 min-w-0 pr-8 @2xl:col-span-1 @2xl:pr-0">
        <p className="line-clamp-2 font-medium text-ink">{itemTitle(item)}</p>
        <p className="truncate text-xs text-muted">
          <span className="font-mono">{item.sku}</span> · in stock {qtyText(item.stockQty, unit)}
        </p>
        {decimal && !line.qty && !error && <p className="mt-1 text-xs font-medium text-brand">Type how many {unitWord(unit).toLowerCase()} the customer wants</p>}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {stitching && (
          <div className="mt-1.5 inline-flex overflow-hidden rounded-control border border-line text-xs" role="group" aria-label="Customer pays or free for stitching">
            {([[false, 'Customer pays'], [true, 'Free — for stitching']] as const).map(([v, label]) => (
              <button key={label} type="button" aria-pressed={!!line.included === v} onClick={() => onChange({ included: v })} className={cn('px-2.5 py-1', !!line.included === v ? 'bg-brand text-white' : 'text-ink-soft hover:bg-page')}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {field(unitWord(unit), 'qty', unit, { step: decimal ? '0.01' : '1', placeholder: decimal ? '0.0' : '1', ref: qtyRef })}
      {field(`Rate ₹ per ${unit}`, 'rate', `/${unit}`, { step: '0.01' })}
      <label className="col-span-3 flex min-w-0 flex-col gap-1 @md:col-span-1">
        <span className="text-xs text-muted @2xl:sr-only">Discount</span>
        <span className="flex h-9 min-w-0">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={amtMode ? undefined : 100}
            step="0.01"
            aria-label={amtMode ? 'Discount ₹' : 'Discount %'}
            value={amtMode ? shownAmt : line.discountPct}
            onChange={(e) => onChange(amtMode ? { discAmt: e.target.value, discountPct: pctFromAmt(e.target.value, line.qty, line.rate) } : { discountPct: e.target.value })}
            onFocus={(e) => e.target.select()}
            className={cn(controlClass(), 'h-9 min-w-0 rounded-r-none')}
          />
          <span className="inline-flex shrink-0 overflow-hidden rounded-r-control border border-l-0 border-line text-xs" role="group" aria-label="Discount in % or ₹">
            {([['pct', '%'], ['amt', '₹']] as const).map(([m, t]) => (
              <button key={m} type="button" aria-pressed={(amtMode ? 'amt' : 'pct') === m} onClick={() => setMode(m)}
                className={cn('w-7', (amtMode ? 'amt' : 'pct') === m ? 'bg-brand text-white' : 'bg-card text-ink-soft hover:bg-page')}>{t}</button>
            ))}
          </span>
        </span>
      </label>
      <div className="hidden text-right text-xs text-muted @2xl:block">{gstRate}%</div>
      <div className="col-span-3 flex items-center justify-between @2xl:col-span-1 @2xl:justify-end">
        <span className="text-xs text-muted @2xl:hidden">Amount · GST {gstRate}% included</span>
        <span className="text-sm font-semibold text-ink">{line.included ? <span className="text-xs font-normal text-success">Free</span> : formatINR(amount)}</span>
      </div>
      <button type="button" onClick={onRemove} aria-label={`Remove ${item.sku}`} className="absolute right-3 top-3 rounded-control p-1.5 text-muted hover:bg-page hover:text-ink @2xl:static">
        <IconX size={16} />
      </button>
    </div>
  )
}
