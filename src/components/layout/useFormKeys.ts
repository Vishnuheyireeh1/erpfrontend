import { useEffect } from 'react'
import { BOX_SELECTOR, focusEl, moveByKey, visible } from '@/lib/boxNav'

// Keys in every form and popup (brand orders, purchase, suppliers, products, jobs …), like billing:
//   Enter = next box; on the last box Enter goes to the Save button (Enter again saves — never saved by surprise)
//   Esc = back one box (on the first box Esc closes the popup) · ← → ↑ ↓ = move between boxes
//   F9 / Ctrl+S = the Save button · F2 = the item search (where there is one)
//   Lists: Alt+N = the New / Add button · ↓ from the search box = into the rows (see DataTable)
// Inside an open popup the keys stay in the popup. Not changed:
//   • notes (textarea): Enter moves on, Shift+Enter = new line, arrows stay in the text
//   • search boxes keep Enter (search)
//   • the billing page has its own keys (features/sales/hooks/useBillingKeys.ts)
//   • open lists that use the keys themselves (dropdowns, item picker, customer list) stop the key first
// Listens on document: before a popup's own Esc (registered later), after the boxes' own handlers.
const SAVE = /^(save|update|create|book|post|record|confirm|pay|receive|mark|make bill|add \d)/i
const NEW = /^(new|add)\b/i
const isSearch = (el: HTMLInputElement) =>
  el.type === 'search' || /^search/i.test(el.placeholder) || /^search/i.test(el.getAttribute('aria-label') ?? '') || !!el.closest('[role="search"]')

// The popup on top (the phone menu stays in the page hidden — skipped), else the page.
const area = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter(visible).filter((d) => !d.closest('aside') && !d.querySelector('aside, nav[aria-label="Main"]')).pop() ?? document.querySelector<HTMLElement>('main')
const boxesIn = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>(BOX_SELECTOR)].filter(visible)
const billing = (root: HTMLElement) => root.tagName === 'MAIN' && !!root.querySelector('[data-step]')
const primary = (root: HTMLElement, words: RegExp) =>
  [...root.querySelectorAll<HTMLButtonElement>('button[data-variant="primary"]')].filter((b) => visible(b) && !b.disabled && words.test(b.textContent?.trim() ?? '')).pop()

export function useFormKeys() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const root = area()
      if (!root || billing(root)) return
      const ctrl = e.ctrlKey || e.metaKey
      if (e.key === 'F9' || (ctrl && e.key.toLowerCase() === 's')) {
        e.preventDefault() // never the browser's "save page"
        // A popup, or filling a page form (not a view page's "Receive money" etc.).
        const inForm = root.tagName !== 'MAIN' || (document.activeElement instanceof HTMLElement && root.contains(document.activeElement) && document.activeElement.matches(BOX_SELECTOR))
        if (inForm) primary(root, SAVE)?.click()
        return
      }
      if (e.key === 'F2') {
        const find = root.querySelector<HTMLInputElement>('input[aria-label="Find item"]')
        if (find && visible(find)) { e.preventDefault(); focusEl(find) }
        return
      }
      if (e.altKey && !ctrl && e.key.toLowerCase() === 'n') {
        const add = primary(root, NEW)
        if (add) { e.preventDefault(); add.click() }
        return
      }
      if (ctrl || e.altKey || e.shiftKey) return
      const el = e.target as HTMLElement
      if (!root.contains(el) || !el.matches(BOX_SELECTOR)) return
      if (el instanceof HTMLInputElement && isSearch(el)) {
        // ↓ from a list's search box → its first row.
        const row = e.key === 'ArrowDown' ? root.querySelector<HTMLElement>('tbody tr[tabindex]') : null
        if (row && visible(row)) { e.preventDefault(); row.focus() }
        return
      }
      const boxes = boxesIn(root)
      if (moveByKey(e, el, boxes)) e.preventDefault()
      else if (e.key === 'Enter' && el.tagName !== 'TEXTAREA' && boxes[boxes.length - 1] === el) {
        const save = primary(root, SAVE)
        if (save) { e.preventDefault(); save.focus() }
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])
}
