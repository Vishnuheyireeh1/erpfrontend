const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

// ₹48,250 — Indian digit grouping, no decimals.
export function formatINR(amount: number) {
  return inr.format(amount)
}

// ₹555.19 — with paise (GST reports).
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function formatINR2(amount: number) {
  return inr2.format(amount)
}

// 1 Oct 2026
export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
