import { IconBarcode, IconSearch } from '@tabler/icons-react'
import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { CameraScanModal } from '@/components/ui/CameraScanModal'
import { useToast } from '@/components/ui/toast-context'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { inventoryApi } from '../api/inventory.api'
import { itemTitle } from '../constants'
import type { StockItem } from '../types'
import { ItemPickerList } from './ItemPickerList'

// onDone: Esc closed the open list (billing: go to the metre boxes still empty).
type Props = { onPick: (item: StockItem) => void; placeholder?: string; onDone?: () => void }

const PAGE = 20

// Pick items:
//   • click the box → in-stock items A–Z; type → name, code, SKU, barcode, size, colour
//   • tick one or many (across searches) → Add / Cancel
//   • scanner gun (code + Enter) or the camera Scan button → exact match added at once
// Keys: ↓ ↑ move, Enter adds the highlighted item (list stays open for the next), Space ticks several →
// Enter adds all the ticked ones, a typed code + Enter adds that item, Esc closes.
export function ItemPicker({ onPick, placeholder = 'Scan barcode or search item name / SKU', onDone }: Props) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const [active, setActive] = useState(-1)
  const [selected, setSelected] = useState<Map<number, StockItem>>(() => new Map())
  const [camera, setCamera] = useState(false)
  const debounced = useDebounce(text.trim(), 250)
  // Empty box → only items that have stock; typing → every item (out-of-stock ones show in red).
  const params = { search: debounced || undefined, status: debounced ? ('all' as const) : ('available' as const), page: 1, pageSize: limit }
  const results = useApiQuery(open ? params : 'item-picker-closed', () => (open ? inventoryApi.list(params) : Promise.resolve(null)))
  const data = results.data ?? results.lastData
  const items = data?.items ?? []

  const reset = () => { setText(''); setActive(-1); setLimit(PAGE); setSelected(new Map()) }
  const close = () => { reset(); setOpen(false) }

  const toggle = (item: StockItem) =>
    setSelected((m) => {
      const next = new Map(m)
      if (next.has(item.id)) next.delete(item.id)
      else next.set(item.id, item)
      return next
    })

  const addSelected = () => {
    const list = [...selected.values()]
    if (!list.length) return
    list.forEach(onPick)
    if (list.length > 1) toast.success(`${list.length} items added`)
    close()
    inputRef.current?.focus()
  }

  // Exact code first (scanner / camera), else one match, else show the matches.
  const findCode = useCallback(async (code: string) => {
    const res = await inventoryApi.list({ search: code, status: 'all', page: 1, pageSize: 8 }).catch(() => null)
    const list = res?.items ?? []
    const exact = list.find((i) => i.barcode === code || i.sku === code.toUpperCase())
    if (exact) return { item: exact }
    if (list.length === 1) return { item: list[0] }
    return { item: null, count: list.length }
  }, [])

  const onKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (!open) return close()
      e.preventDefault() // closing the list — not "back" on the billing page
      close()
      return onDone?.()
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      return setActive((a) => Math.max(0, Math.min(items.length - 1, a + step)))
    }
    if (e.key === ' ' && active >= 0 && items[active]) {
      e.preventDefault()
      return toggle(items[active])
    }
    if (e.key !== 'Enter') return
    e.preventDefault()
    const code = text.trim()
    // A typed / scanned code that matches exactly is added at once (scanner gun).
    if (code && active < 0) {
      const found = await findCode(code)
      if (found.item) {
        onPick(found.item)
        setText('')
        return
      }
      if (found.count === 0) return toast.error(`No item found for "${code}"`)
    }
    if (selected.size) return addSelected()
    // Keyboard billing: Enter adds the highlighted item at once and the list stays open → ↓ + Enter for the next one.
    if (active >= 0 && items[active]) {
      onPick(items[active])
      toast.success(`Added ${itemTitle(items[active])}`)
    }
  }

  const onScanned = useCallback(async (code: string) => {
    setCamera(false)
    const found = await findCode(code)
    if (found.item) {
      onPick(found.item)
      toast.success(`Added ${itemTitle(found.item)}`)
    } else {
      setText(code)
      setOpen(true)
      if (found.count === 0) toast.error(`No item found for "${code}"`)
    }
    inputRef.current?.focus()
  }, [findCode, onPick, toast])

  return (
    <div className="relative">
      <div className="flex h-11 items-center gap-2 rounded-control border border-line bg-card pl-3 pr-1 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-tint">
        <IconSearch size={18} className="shrink-0 text-muted" aria-hidden />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); setLimit(PAGE) }}
          // Reaching the box (Enter / arrows / F2 / a click) opens the list — billing starts on the customer name, not here.
          onFocus={() => { setOpen(true); setActive(-1) }}
          onClick={() => setOpen(true)}
          // Clicking elsewhere closes the list; ticked items stay ticked until Add / Cancel.
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Find item"
          role="combobox"
          aria-expanded={open}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
        {selected.size > 0 && !open && (
          <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-white">{selected.size} selected</button>
        )}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setOpen(false); setCamera(true) }}
          className="flex h-9 shrink-0 items-center gap-1 rounded-control px-2 text-sm font-medium text-brand hover:bg-brand-tint"
          title="Scan with the camera (a scanner gun works without clicking — just scan)"
        >
          <IconBarcode size={18} aria-hidden />
          <span className="hidden sm:inline">Scan</span>
        </button>
      </div>

      {open && (
        <ItemPickerList
          heading={`${debounced ? `Matching "${debounced}"` : 'In stock, A–Z'}${data ? ` · ${data.total}` : ''}`}
          items={items}
          loading={results.loading}
          loaded={!!data}
          emptyText={debounced ? 'No items found' : 'No items in stock yet'}
          moreCount={Math.max(0, (data?.total ?? 0) - items.length)}
          active={active}
          selected={selected}
          onHover={setActive}
          onToggle={toggle}
          onMore={() => setLimit((l) => l + PAGE)}
          onAdd={addSelected}
          onCancel={close}
        />
      )}
      {camera && <CameraScanModal onResult={onScanned} onClose={() => setCamera(false)} />}
    </div>
  )
}
