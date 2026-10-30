import { BILLING_KEYS } from '../hooks/useBillingKeys'

// Billing page footer: the keyboard keys (F1 hides / shows it).
export function BillingKeysBar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  if (!open) {
    return (
      <button type="button" onClick={onToggle} className="mt-4 text-xs text-muted hover:text-ink">
        Keyboard keys — press <kbd className="rounded border border-line bg-card px-1 font-mono">F1</kbd>
      </button>
    )
  }
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-line bg-card px-4 py-3 text-xs text-ink-soft" aria-label="Keyboard keys">
      {BILLING_KEYS.map(([k, label]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <kbd className="rounded border border-line bg-page px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink">{k}</kbd>
          {label}
        </span>
      ))}
      <button type="button" onClick={onToggle} className="ml-auto text-muted hover:text-ink">Hide</button>
    </div>
  )
}
