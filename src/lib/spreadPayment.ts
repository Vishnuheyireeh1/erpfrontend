// Puts a payment against unpaid bills — the chosen bill first, then the oldest — never more than each bill's due.
// Used to fill the per-bill boxes so they always follow the amount typed (part payments leave the rest pending).
export function spreadPayment<T>(bills: T[], keyOf: (b: T) => string, due: (b: T) => number, total: number, firstKey?: string) {
  const ordered = firstKey ? [...bills.filter((b) => keyOf(b) === firstKey), ...bills.filter((b) => keyOf(b) !== firstKey)] : bills
  const out: Record<string, string> = {}
  let left = total
  for (const b of ordered) {
    const v = Math.round(Math.min(due(b), Math.max(0, left)) * 100) / 100
    if (v > 0) out[keyOf(b)] = String(v)
    left -= v
  }
  return out
}
