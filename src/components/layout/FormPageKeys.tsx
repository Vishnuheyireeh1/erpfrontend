import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BOX_SELECTOR, focusEl, visible } from '@/lib/boxNav'

const HIDE_KEY = 'sairandhri.formKeys.hidden'
const KEYS: [string, string][] = [['Enter', 'Next box'], ['Esc', 'Back'], ['← → ↑ ↓', 'Move between boxes'], ['F2', 'Item search'], ['F9', 'Save'], ['Alt+M', 'Side menu'], ['F1', 'All keys']]
const isFormPage = (path: string) => /\/(new|edit)$/.test(path) // products/new, purchase/new, brand-orders/:id/edit …
const readHidden = () => { try { return localStorage.getItem(HIDE_KEY) === '1' } catch { return false } }

// Every "new" / "edit" page (laptop): the cursor starts in the first box, and the keys stay in view at the bottom.
// Forms that load data first show their boxes a moment later, so this waits for them (a few seconds at most).
export function FormPageKeys() {
  const { pathname } = useLocation()
  const form = isFormPage(pathname)
  const [hidden, setHidden] = useState(readHidden)

  useEffect(() => {
    if (!form || window.matchMedia('(pointer: coarse)').matches) return // a phone keeps its keyboard closed
    let tries = 0
    const timer = window.setInterval(() => {
      const active = document.activeElement
      const typing = active instanceof HTMLElement && active.matches(BOX_SELECTOR)
      const first = [...document.querySelectorAll<HTMLElement>(`main ${BOX_SELECTOR.split(', ').join(', main ')}`)].find(visible)
      if (first && !typing) focusEl(first)
      if (first || typing || ++tries > 50) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
  }, [form, pathname])

  if (!form) return null
  const toggle = () => setHidden((h) => {
    try { localStorage.setItem(HIDE_KEY, h ? '0' : '1') } catch { /* private mode — keep in memory only */ }
    return !h
  })
  if (hidden) {
    return <button type="button" onClick={toggle} className="mt-4 hidden text-xs text-muted hover:text-ink lg:block">Show keyboard keys</button>
  }
  return (
    <div className="sticky bottom-2 z-10 mt-4 hidden flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-line bg-card px-4 py-2 text-xs text-ink-soft shadow-sm lg:flex" aria-label="Keyboard keys">
      {KEYS.map(([k, label]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <kbd className="rounded border border-line bg-page px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink">{k}</kbd>
          {label}
        </span>
      ))}
      <button type="button" onClick={toggle} className="ml-auto text-muted hover:text-ink">Hide</button>
    </div>
  )
}
