import { Button } from '@/components/ui/Button'
import { formatINR } from '@/lib/format'
import type { Billing } from '../hooks/useBilling'

// Shown while a saved bill is open for editing: saving keeps its number; money already paid stays on it.
export function EditingBanner({ b }: { b: Billing }) {
  if (!b.editing) return null
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
      <p className="text-ink">
        <span className="font-semibold">Editing {b.editing.docNo}</span> — save keeps the same bill number. Already paid {formatINR(b.editing.paid)}
        {b.grandTotal > b.editing.paid + 0.004 ? `; take ${formatINR(b.payable)} more now (or leave it as credit for a named customer).` : b.grandTotal < b.editing.paid - 0.004 ? `; ${formatINR(b.editing.paid - b.grandTotal)} becomes the customer's advance.` : '.'}
      </p>
      <Button onClick={b.clearAll}>Stop editing</Button>
    </div>
  )
}
