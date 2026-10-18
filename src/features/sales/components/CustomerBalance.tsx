import { formatINR } from '@/lib/format'

// + = customer owes the shop; − = advance / credit held for them.
export function CustomerBalance({ balance }: { balance: number }) {
  if (Math.abs(balance) < 0.005) return <span className="text-muted">Settled</span>
  return balance > 0 ? (
    <span className="font-medium text-warn">{formatINR(balance)} due</span>
  ) : (
    <span className="font-medium text-success">{formatINR(-balance)} advance</span>
  )
}
