import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'

const KEYS: [string, [string, string][]][] = [
  ['Every page', [['Alt+M', 'Side menu (↑ ↓, Enter opens, Esc back)'], ['Ctrl+K or /', 'Top search'], ['Alt+B', 'Billing'], ['F1', 'This list']]],
  ['Lists', [['Alt+N', 'New / Add button'], ['↓ from search', 'Into the rows'], ['↑ ↓', 'Move between rows'], ['Enter', 'Open the row'], ['Esc', 'Back to search']]],
  ['Forms and popups', [['Enter', 'Next box; from the last box to Save'], ['Esc', 'Back one box; first box closes the popup'], ['← → ↑ ↓', 'Move between boxes'], ['F9 or Ctrl+S', 'Save'], ['F2', 'Item search'], ['Shift+Enter', 'New line in notes']]],
  ['Dropdowns and More menu', [['↓', 'Open the list'], ['↑ ↓', 'Move'], ['Enter', 'Pick'], ['Esc', 'Close']]],
]

// F1 on any page: every key in one list. (Billing has its own keys bar, so F1 there hides / shows that.)
export function KeysHelp() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key !== 'F1' || document.querySelector('main [data-step]')) return
      e.preventDefault()
      setOpen((o) => !o)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])
  if (!open) return null
  return (
    <Modal open onClose={() => setOpen(false)} title="Keyboard keys">
      <div className="flex flex-col gap-4">
        {KEYS.map(([title, rows]) => (
          <div key={title}>
            <p className="mb-1 text-sm font-semibold text-ink">{title}</p>
            {rows.map(([k, what]) => (
              <p key={k} className="flex gap-3 py-0.5 text-sm"><kbd className="w-28 shrink-0 font-mono text-xs text-ink">{k}</kbd><span className="text-ink-soft">{what}</span></p>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  )
}
