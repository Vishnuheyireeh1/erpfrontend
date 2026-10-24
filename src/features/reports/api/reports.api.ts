import { api } from '@/lib/api'
import type { Dashboard, ItemKind, ItemProfit, GstRegister, GstSummary, HsnSummary, ItemPurchase, ItemSold, SalesByCategory, SalesByCustomer, SalesByDay, StockReport, SupplierPurchase, WhoOwes } from '../types'

const qs = (p: Record<string, string | undefined>) => new URLSearchParams(Object.entries(p).filter((e): e is [string, string] => !!e[1])).toString()
type Range = { from: string; to: string }

export const reportsApi = {
  dashboard: () => api.get<Dashboard>('/dashboard'),
  salesByDay: (r: Range) => api.get<SalesByDay>(`/reports/sales/by-day?${qs(r)}`),
  itemsSold: (r: Range) => api.get<{ from: string; to: string; items: ItemSold[] }>(`/reports/sales/items?${qs(r)}`),
  gstSummary: (r: Range) => api.get<GstSummary>(`/reports/gst/summary?${qs(r)}`),
  gstSales: (r: Range & { b2b?: boolean }) => api.get<GstRegister>(`/reports/gst/sales?${qs({ from: r.from, to: r.to, b2b: r.b2b ? '1' : undefined })}`),
  gstPurchases: (r: Range) => api.get<GstRegister>(`/reports/gst/purchases?${qs(r)}`),
  gstHsn: (r: Range) => api.get<HsnSummary>(`/reports/gst/hsn?${qs(r)}`),
  itemProfit: (r: Range & { kind?: ItemKind }) => api.get<ItemProfit>(`/reports/analysis/item-profit?${qs(r)}`),
  byCategory: (r: Range) => api.get<SalesByCategory>(`/reports/analysis/by-category?${qs(r)}`),
  byCustomer: (r: Range) => api.get<SalesByCustomer>(`/reports/analysis/by-customer?${qs(r)}`),
  whoOwes: () => api.get<WhoOwes>('/reports/analysis/who-owes'),
  stockOnDate: (p: { date: string; search?: string; page: number }) => api.get<StockReport>(`/reports/analysis/stock-on-date?${qs({ date: p.date, search: p.search, page: String(p.page), pageSize: '50' })}`),
  slowMoving: (p: { days: number; search?: string; page: number }) => api.get<StockReport>(`/reports/analysis/slow-moving?${qs({ days: String(p.days), search: p.search, page: String(p.page), pageSize: '50' })}`),
  purchasesBySupplier: (r: Range) => api.get<{ from: string; to: string; items: SupplierPurchase[]; total: Omit<SupplierPurchase, 'supplierId' | 'name' | 'bills'> }>(`/reports/analysis/purchases?${qs(r)}`),
  purchasesByItem: (r: Range) => api.get<{ from: string; to: string; items: ItemPurchase[] }>(`/reports/analysis/purchases?${qs({ ...r, by: 'item' })}`),
}

// Where a document in a GST register opens.
export const docLinks: Record<string, (id: number) => string> = {
  BILL: (id) => `/sales/${id}`,
  JOB: (id) => `/jobs/${id}`,
  BRAND: (id) => `/brand-bills/${id}`,
  RETURN: (id) => `/sales/returns/${id}`,
  PURCHASE: (id) => `/purchase/${id}`,
  PURCHASE_RETURN: (id) => `/purchase/returns/${id}`,
}
export const docKindLabels: Record<string, string> = { BILL: 'Sales bill', JOB: 'Job bill', BRAND: 'Brand bill', RETURN: 'Return', PURCHASE: 'Purchase bill', PURCHASE_RETURN: 'Purchase return' }
