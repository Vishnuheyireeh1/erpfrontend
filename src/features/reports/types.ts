import type { JobStatus } from '@/features/jobs/types'

export type Tax = { taxable: number; cgst: number; sgst: number; igst: number; tax: number }
export type RateRow = Tax & { rate: number }

export type Dashboard = {
  today: string
  sales: { today: number; yesterday: number; billCount: number; jobCount: number; last14: { date: string; net: number }[] }
  money: { receivedToday: number; cash: number; bank: number; spentToday: number }
  month: { income: number; netProfit: number; marginPct: number }
  jobs: {
    open: number; overdue: number; ready: number; dueToday: number
    due: { id: number; docNo: string; customer: string; expectedDate: string; status: JobStatus; garments: string; tailors: string; balance: number; overdue: boolean }[]
  }
  // Latest jobs whose job cost (tailor / work) is not entered yet.
  noCost: { count: number; items: { id: number; docNo: string; customer: string; docDate: string; status: JobStatus; garments: string; reason: string }[] }
  lowStock: { count: number; items: { variantId: number; productId: number; name: string; sku: string; stock: number; min: number }[] }
  owed: { byCustomers: number; customerDocs: number; toSuppliers: number; supplierBills: number; fees: number; feeStudents: number }
  brands: { pending: number; owing: number; openOrders: number; lateOrders: number; readyPieces: number }
  topItems: ItemSold[]
}

export type DaySales = { date: string; bills: number; billCount: number; jobs: number; jobCount: number; returns: number; net: number }
export type SalesByDay = { from: string; to: string; days: DaySales[]; total: Omit<DaySales, 'date'> }
export type ItemSold = { productId: number; name: string; qty: number; amount: number; profit: number }

export type GstSummary = {
  from: string; to: string
  outward: RateRow[]; outwardTotal: Tax
  split: { b2b: Tax; b2c: Tax; returns: Tax }
  inward: RateRow[]; inwardTotal: Tax
  payable: { cgst: number; sgst: number; igst: number; total: number }
}

export type GstDoc = Tax & { date: string; refId: number; kind: string; docNo: string; party: string; gstin: string | null; billNo: string | null; rates: string; total: number }
export type GstRegister = { from: string; to: string; items: GstDoc[]; total: Tax }
export type HsnRow = RateRow & { hsn: string; qty: number }
export type HsnSummary = { from: string; to: string; items: HsnRow[]; total: Tax; missingHsn: number }

// ---- Analysis reports ----
export type CategorySales = { category: string; qty: number; amount: number; profit: number }
// Reports → Profit by item.
export type ItemKind = 'STITCHING' | 'SALE' | 'BRAND'
export type ItemProfitRow = { kind: ItemKind; item: string; pieces: number; avgRate: number; total: number; tailor: number; embroidery: number; other: number; cloth: number; profit: number; marginPct: number }
export type ItemProfit = { from: string; to: string; kind: ItemKind | null; rows: ItemProfitRow[]; totals: Omit<ItemProfitRow, 'kind' | 'item' | 'avgRate' | 'marginPct'> }
export type SalesByCategory = { from: string; to: string; items: CategorySales[]; goods: number; stitching: { amount: number; jobs: number }; total: number }
export type CustomerSales = { customerId: number | null; name: string; phone: string | null; bills: number; jobs: number; returns: number; total: number; visits: number; lastVisit: string }
export type SalesByCustomer = { from: string; to: string; items: CustomerSales[]; total: number; customers: number }
export type Owes = { customerId: number; code: string; name: string; phone: string | null; upTo30: number; d31to60: number; d61to90: number; over90: number; other: number; owed: number; oldestBill: string | null }
export type WhoOwes = { items: Owes[]; total: Omit<Owes, 'customerId' | 'code' | 'name' | 'phone' | 'oldestBill'> }
export type StockRow = { variantId: number; name: string; sku: string; unit: string; category: string; qty: number; value: number; avgCost?: number; lastSold?: string | null; inStockSince?: string | null; idleDays?: number | null }
export type StockReport = { items: StockRow[]; total: number; value: number; page: number; pageSize: number; date?: string; days?: number }
export type SupplierPurchase = { supplierId: number; name: string; bills: number; taxable: number; gst: number; total: number; paid: number; returned: number; due: number }
export type ItemPurchase = { variantId: number; name: string; sku: string; unit: string; qty: number; taxable: number; avgRate: number; suppliers: string }
