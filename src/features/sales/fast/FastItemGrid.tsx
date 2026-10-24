import { IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { useToast } from '@/components/ui/toast-context'
import { inventoryApi } from '@/features/inventory/api/inventory.api'
import { itemTitle } from '@/features/inventory/constants'
import type { StockItem } from '@/features/inventory/types'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import type { SaleLineDraft } from '../components/SaleLineRow'
import { lineError, type Billing } from '../hooks/useBilling'

type Col = 'qty' | 'rate' | 'pct' | 'amt'
const COLS: Col[] = ['qty', 'rate', 'pct', 'amt']
type Props = { b: Billing; entryRef: RefObject<HTMLInputElement | null>; onSearch: (text: string) => void; onPick: (item: StockItem) => void; pendingId: number | null; onFocused: () => void }

const r2 = (n: number) => Math.round(n * 100) / 100
const discAmt = (l: SaleLineDraft) => r2(((Number(l.qty) || 0) * (Number(l.rate) || 0) * (Number(l.discountPct) || 0)) / 100)
const cell = 'h-9 w-full rounded-[6px] border border-transparent bg-transparent px-2 text-right text-sm tabular-nums outline-none hover:border-line focus:border-brand focus:bg-card'

// Fast bill item table (like EQUAL): type / scan a code in the last row + Enter → the item is added and the cursor goes
// to its Qty; Enter moves Qty → Rate → Disc % → Disc ₹ → the next code. ↑ ↓ move between rows. F2 = search by name.
// Disc ₹ is turned into the % the bill keeps (same amount). On a job bill each item can be "Free" (used for stitching).
export function FastItemGrid({ b, entryRef, onSearch, onPick, pendingId, onFocused }: Props) {
  const toast = useToast()
  const refs = useRef(new Map<string, HTMLInputElement>())
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const at = (key: string, col: Col) => refs.current.get(`${key}:${col}`)
  const go = (el?: HTMLInputElement | null) => { el?.focus(); el?.select() }

  // Just added (or picked again) → its quantity box.
  useEffect(() => {
    if (pendingId === null) return
    const line = b.lines.find((l) => l.item.id === pendingId)
    if (line) { go(at(line.key, 'qty')); onFocused() }
  }, [pendingId, b.lines, onFocused])

  const findCode = async () => {
    const text = code.trim()
    if (!text) return onSearch('')
    setBusy(true)
    const res = await inventoryApi.list({ search: text, status: 'all', page: 1, pageSize: 8 }).catch(() => null)
    setBusy(false)
    const list = res?.items ?? []
    const exact = list.find((i) => i.barcode === text || i.sku === text.toUpperCase()) ?? (list.length === 1 ? list[0] : null)
    if (exact) { setCode(''); return onPick(exact) }
    if (!list.length) toast.error(`No item found for "${text}"`)
    onSearch(text)
    setCode('')
  }

  const onCellKey = (e: KeyboardEvent<HTMLInputElement>, i: number, col: Col) => {
    const line = b.lines[i]
    if (e.key === 'Enter') {
      e.preventDefault()
      const next = COLS[COLS.indexOf(col) + 1]
      return next ? go(at(line.key, next)) : go(entryRef.current)
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const to = b.lines[i + (e.key === 'ArrowDown' ? 1 : -1)]
      return to ? go(at(to.key, col)) : e.key === 'ArrowDown' ? go(entryRef.current) : undefined
    }
    if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault()
      b.removeLine(line.key)
      go(entryRef.current)
    }
  }
  const input = (l: SaleLineDraft, i: number, col: Col, value: string, onChange: (v: string) => void, label: string) => (
    <input
      ref={(el) => { if (el) refs.current.set(`${l.key}:${col}`, el); else refs.current.delete(`${l.key}:${col}`) }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => onCellKey(e, i, col)}
      onFocus={(e) => e.target.select()}
      inputMode="decimal"
      aria-label={`${label} — ${l.item.product.name}`}
      className={cell}
    />
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-page text-xs font-medium text-muted">
            <th className="w-10 px-2 py-2 text-left">Sl</th>
            <th className="w-40 px-2 text-left">Code</th>
            <th className="px-2 text-left">Name</th>
            <th className="w-24 px-2 text-right">Qty</th>
            <th className="w-14 px-2 text-left">Unit</th>
            <th className="w-28 px-2 text-right">Rate ₹</th>
            <th className="w-20 px-2 text-right">Disc %</th>
            <th className="w-24 px-2 text-right">Disc ₹</th>
            <th className="w-28 px-2 text-right">Total ₹</th>
            {b.isJob && <th className="w-14 px-2 text-center">Free</th>}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {b.lines.map((l, i) => {
            const err = b.showErrors ? lineError(l) : undefined
            const calc = b.lineCalc(l, i)
            return (
              <tr key={l.key} className={cn('border-b border-line', err && 'bg-danger-tint')} title={err}>
                <td className="px-2 text-muted">{i + 1}</td>
                <td className="px-2 font-mono text-xs text-ink-soft">{l.item.sku}</td>
                <td className="px-2"><span className="line-clamp-1 font-medium text-ink">{itemTitle(l.item)}</span></td>
                <td className="px-1">{input(l, i, 'qty', l.qty, (v) => b.changeLine(l.key, { qty: v, discAmt: undefined }), 'Quantity')}</td>
                <td className="px-2 text-xs uppercase text-muted">{l.item.product.unit.code}</td>
                <td className="px-1">{input(l, i, 'rate', l.rate, (v) => b.changeLine(l.key, { rate: v, discAmt: undefined }), 'Rate')}</td>
                <td className="px-1">{input(l, i, 'pct', l.discountPct, (v) => b.changeLine(l.key, { discountPct: v, discAmt: undefined }), 'Discount %')}</td>
                <td className="px-1">
                  {input(l, i, 'amt', l.discAmt ?? (discAmt(l) ? String(discAmt(l)) : ''), (v) => {
                    const gross = (Number(l.qty) || 0) * (Number(l.rate) || 0)
                    const pct = gross > 0 ? Math.round(((Number(v) || 0) / gross) * 1_000_000) / 10_000 : 0
                    b.changeLine(l.key, { discAmt: v, discountPct: v === '' || !pct ? '' : String(Math.min(100, pct)) })
                  }, 'Discount ₹')}
                </td>
                <td className="px-2 text-right font-semibold tabular-nums">{l.included ? <span className="text-xs font-normal text-muted">free</span> : formatINR(calc?.amount ?? 0)}</td>
                {b.isJob && (
                  <td className="text-center">
                    <input type="checkbox" checked={!!l.included} onChange={(e) => b.changeLine(l.key, { included: e.target.checked })} aria-label="Free — used for stitching" className="size-4 accent-brand" />
                  </td>
                )}
                <td><button type="button" tabIndex={-1} onClick={() => b.removeLine(l.key)} aria-label={`Remove ${l.item.product.name}`} className="rounded p-1 text-muted hover:text-danger"><IconX size={15} /></button></td>
              </tr>
            )
          })}
          <tr className="bg-brand-tint/30">
            <td className="px-2 text-muted">{b.lines.length + 1}</td>
            <td className="px-1 py-1" colSpan={2}>
              <input
                ref={entryRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); if (!busy) void findCode() }
                  if (e.key === 'ArrowUp' && b.lines.length) { e.preventDefault(); go(at(b.lines[b.lines.length - 1].key, 'qty')) }
                }}
                placeholder="Scan or type code · Enter   (F2 = search by name)"
                aria-label="Item code or barcode"
                autoComplete="off"
                className="h-9 w-full rounded-[6px] border border-brand bg-card px-2 font-mono text-sm outline-none"
              />
            </td>
            <td colSpan={b.isJob ? 8 : 7} className="px-2 text-xs text-muted">{busy ? 'Finding…' : b.lines.length ? 'Ctrl+Del removes a row' : ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
