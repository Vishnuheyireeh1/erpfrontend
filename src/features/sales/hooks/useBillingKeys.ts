import { useEffect, useRef } from 'react'
import { focusEl, moveByKey, visible } from '@/lib/boxNav'

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
export const TARGET: Record<string, string> = {
  F2: 'input[aria-label="Find item"]',
  F3: '[data-hotkey="customer-name"], button[aria-label="Change customer"]',
  F4: '[data-hotkey="customer-phone"], button[aria-label="Change customer"]',
  F5: '[data-hotkey="garment"]',
  F7: '[data-hotkey="discount"]',
  F8: 'input[aria-label="Payment 1 amount"]',
}

export function focusBox(selector: string, last = false) {
  const all = [...document.querySelectorAll<HTMLElement>(selector)].filter(visible)
  const el = last ? all[all.length - 1] : all[0]
  if (el) focusEl(el)
}

// The boxes on the page in step order 1 → 4 (a laptop shows two columns, so page order isn't step order),
// then screen order inside a step. Inputs and dropdowns only, + the picked customer's Change button
// (so Esc from the items comes back to the customer).
const stepOf = (el: HTMLElement) => Number(el.closest<HTMLElement>('[data-step]')?.dataset.step ?? 99)
const allBoxes = () => [...document.querySelectorAll<HTMLElement>('main input:not([type=hidden]):not([type=checkbox]):not([disabled]):not([readonly]), main select:not([disabled]), main button[aria-label="Change customer"]')]
  .filter(visible)
  .sort((a, z) => stepOf(a) - stepOf(z))

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
        if (moveByKey(e, e.target as HTMLElement, allBoxes())) e.preventDefault()
      }
    }
    window.addEventListener('keydown', down)
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', down) }
  }, [])
}
