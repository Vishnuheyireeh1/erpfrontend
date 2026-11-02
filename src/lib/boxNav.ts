// Moving between boxes with the keys, like the old software (billing + every form / popup):
// Enter / → = next box, Esc / ← = previous box, ↑ ↓ = the box in the row above / below.
// "boxes" = the inputs and dropdowns of one area (a popup or the page), in the order the keys walk them.

export const BOX_SELECTOR = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly])'

export const visible = (el: HTMLElement) => el.offsetParent !== null

export function focusEl(el: HTMLElement) {
  el.focus()
  if (el instanceof HTMLInputElement && el.type !== 'date') el.select()
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

export function stepBox(from: HTMLElement, boxes: HTMLElement[], step: 1 | -1) {
  const to = boxes[boxes.indexOf(from) + step]
  if (!boxes.includes(from) || !to) return false
  focusEl(to)
  return true
}

// The nearest box in the row above / below (closest to the same column).
export function rowBox(from: HTMLElement, boxes: HTMLElement[], dir: 1 | -1) {
  const r = from.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cands = boxes.filter((b) => b !== from).map((b) => {
    const q = b.getBoundingClientRect()
    return { b, dy: dir === 1 ? q.top - r.bottom : r.top - q.bottom, dx: Math.abs(q.left + q.width / 2 - cx) }
  }).filter((c) => c.dy > -4).sort((a, z) => a.dy - z.dy)
  if (!cands.length) return false
  const row = cands.filter((c) => c.dy <= cands[0].dy + 12)
  focusEl(row.sort((a, z) => a.dx - z.dx)[0].b)
  return true
}

// In a typed box ← / → move out only from the very start / end (number boxes have no cursor — always move).
export function atEdge(el: HTMLElement, dir: 1 | -1) {
  if (!(el instanceof HTMLInputElement)) return true
  const start = el.selectionStart
  const end = el.selectionEnd
  if (start === null || end === null) return true
  return dir === -1 ? start === 0 && (end === 0 || end === el.value.length) : end === el.value.length
}

// One key in a box → moved? (the caller then stops the key). Dates keep their arrows; notes keep their arrows
// (Enter moves on from notes too — Shift+Enter, which never reaches here, is the new line).
export function moveByKey(e: KeyboardEvent, el: HTMLElement, boxes: HTMLElement[]) {
  const k = e.key
  const date = el instanceof HTMLInputElement && el.type === 'date'
  const note = el.tagName === 'TEXTAREA'
  if (k === 'Enter') return stepBox(el, boxes, 1)
  if (k === 'Escape') return stepBox(el, boxes, -1)
  if ((k === 'ArrowRight' || k === 'ArrowLeft') && !date && !note && atEdge(el, k === 'ArrowRight' ? 1 : -1)) return stepBox(el, boxes, k === 'ArrowRight' ? 1 : -1)
  if ((k === 'ArrowDown' || k === 'ArrowUp') && !date && !note && el.tagName !== 'SELECT') return rowBox(el, boxes, k === 'ArrowDown' ? 1 : -1)
  return false
}
