// Top-bar search: result shape from GET /api/search, and every result as a link (for ↑ / ↓ / Enter).

export type SearchHit = { key: string; to: string }
export type SearchData = {
  customers: { id: number; code: string; name: string; phone: string | null; balance: number }[]
  jobs: { id: number; docNo: string; customerName: string; status: string; expectedDate: string; due: number; garments: string }[]
  bills: { id: number; docNo: string; customerName: string; docDate: string; grandTotal: string; status: string }[]
  products: { id: number; code: string; name: string; unit: string; stock: number; price: number }[]
}

// Every result as a link target, in the order shown (for ↑ / ↓ / Enter).
export const hitsOf = (d: SearchData): SearchHit[] => [
  ...d.customers.map((c) => ({ key: `c${c.id}`, to: `/customers/${c.id}` })),
  ...d.jobs.map((j) => ({ key: `j${j.id}`, to: `/jobs/${j.id}` })),
  ...d.bills.map((b) => ({ key: `b${b.id}`, to: `/sales/${b.id}` })),
  ...d.products.map((p) => ({ key: `p${p.id}`, to: `/products/${p.id}` })),
]

