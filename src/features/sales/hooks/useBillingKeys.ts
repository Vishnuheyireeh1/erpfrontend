import { useEffect, useRef } from 'react'

// Billing page keys for staff used to the old keyboard billing software.
//   F1 help · F2 item search · F3 customer name · F4 phone · F5 garment · F6 measurements · F7 discount
//   F8 payment · F9 / Ctrl+S save · Ctrl+P print after saving on/off.
// Moving like the old software: Enter = next box, Esc = back one box, arrows = the box left / right / above / below
// (in a typed box ← → first move the cursor to the start / end; open lists keep their own ↑ ↓ / Enter / Esc).
export const BILLING_KEYS: [string, string][] = [
  ['F2', 'Item search'], ['F3', 'Customer name'], ['F4', 'Phone'], ['F5', 'Add garment'], ['F6', 'Measurements'],
  ['F7', 'Discount'], ['F8', 'Payment'], ['F9', 'Save'], ['Ctrl+P', 'Print on/off'], ['Enter', 'Next box'], ['Esc', 'Back'], ['← → ↑ ↓', 'Move between boxes'], ['Alt+M', 'Side menu'], ['Ctrl+K', 'Search'], ['F1', 'Hide keys'],
]

// Boxes the keys jump to (data-hotkey is set on them; item search / payment by their labels).
const TARGET: Record<string, string> = {
  F2: 'input[aria-label="Find item"]',
  F3: '[data-hotkey="customer-name"], button[aria-label="Change customer"]',
  F4: '[data-hotkey="customer-phone"], button[aria-label="Change customer"]',
  F5: '[data-hotkey="garment"]',
  F7: '[data-hotkey="discount"]',
  F8: 'input[aria-label="Payment 1 amount"]',
}

const visible = (el: HTMLElement) => el.offsetParent !== null
function focusEl(el: HTMLElement) {
  el.focus()
  if (el instanceof HTMLInputElement && el.type !== 'date') el.select()
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
export function focusBox(selector: string, last = false) {
  const all = [...document.querySelectorAll<HTMLElement>(selector)].filter(visible)
  const el = last ? all[all.length - 1] : all[0]
  if (el) focusEl(el)
}

// The boxes on the page in screen order (inputs and dropdowns; buttons and notes are skipped).
const allBoxes = () => [...document.querySelectorAll<HTMLElement>('main input:not([type=hidden]):not([type=checkbox]):not([disabled]):not([readonly]), main select:not([disabled])')].filter(visible)

// Enter / → = next box, Esc / ← = previous box.
function stepBox(from: HTMLElement, step: 1 | -1) {
  const boxes = allBoxes()
  const to = boxes[boxes.indexOf(from) + step]
  if (!boxes.includes(from) || !to) return false
  focusEl(to)
  return true
}

// ↑ ↓ = the nearest box in the row above / below (closest to the same column).
function rowBox(from: HTMLElement, dir: 1 | -1) {
  const r = from.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cands = allBoxes().filter((b) => b !== from).map((b) => {
    const q = b.getBoundingClientRect()
    return { b, dy: dir === 1 ? q.top - r.bottom : r.top - q.bottom, dx: Math.abs(q.left + q.width / 2 - cx) }
  }).filter((c) => c.dy > -4).sort((a, z) => a.dy - z.dy)
  if (!cands.length) return false
  const row = cands.filter((c) => c.dy <= cands[0].dy + 12)
  focusEl(row.sort((a, z) => a.dx - z.dx)[0].b)
  return true
}

// In a typed box ← / → move out only from the very start / end (number boxes have no cursor — always move).
function atEdge(el: HTMLElement, dir: 1 | -1) {
  if (!(el instanceof HTMLInputElement)) return true
  const start = el.selectionStart
  const end = el.selectionEnd
  if (start === null || end === null) return true
  return dir === -1 ? start === 0 && (end === 0 || end === el.value.length) : end === el.value.length
}
const isBox = (el: HTMLElement) => el.tagName === 'INPUT' || el.tagName === 'SELECT'

type Handlers = { onSave: () => void; onTogglePrint: () => void; onToggleHelp: () => void }

export function useBillingKeys(handlers: Handlers) {
  const h = useRef(handlers)
  useEffect(() => { h.current = handlers })

  useEffect(() => {
    // The cursor starts on the customer name (F2 jumps to item search).
    const t = window.setTimeout(() => focusBox(TARGET.F3), 300)
    const down = (e: KeyboardEvent) => {
      // An open popup handles its own keys (the phone menu stays in the page hidden — ignored).
      if ([...document.querySelectorAll<HTMLElement>('[role="dialog"]')].some(visible)) return
      const k = e.key
      const ctrl = e.ctrlKey || e.metaKey
      if (k === 'F1') { e.preventDefault(); h.current.onToggleHelp() }
      else if (k === 'F9' || (ctrl && k.toLowerCase() === 's')) { e.preventDefault(); h.current.onSave() }
      else if (ctrl && k.toLowerCase() === 'p') { e.preventDefault(); h.current.onTogglePrint() }
      else if (k === 'F6') { e.preventDefault(); focusBox('[data-hotkey="measure"]', true) }
      else if (TARGET[k]) { e.preventDefault(); focusBox(TARGET[k]) }
      else if (!e.defaultPrevented && !ctrl && !e.shiftKey && !e.altKey && isBox(e.target as HTMLElement)) {
        const el = e.target as HTMLElement
        const date = el instanceof HTMLInputElement && el.type === 'date' // its arrows change the day / month
        let moved = false
        if (k === 'Enter') moved = stepBox(el, 1)
        else if (k === 'Escape') moved = stepBox(el, -1)
        else if ((k === 'ArrowRight' || k === 'ArrowLeft') && !date && atEdge(el, k === 'ArrowRight' ? 1 : -1)) moved = stepBox(el, k === 'ArrowRight' ? 1 : -1)
        else if ((k === 'ArrowDown' || k === 'ArrowUp') && !date && el.tagName !== 'SELECT') moved = rowBox(el, k === 'ArrowDown' ? 1 : -1)
        if (moved) e.preventDefault()
      }
    }
    window.addEventListener('keydown', down)
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', down) }
  }, [])
}
