import { api } from '@/lib/api'

// Document numbers (same formats as the server's services/numbering/docFormat.ts — preview only).
export type Layout = 'P/FY/N' | 'P/FYS/N' | 'N/FYS-P' | 'P-FYS-N' | 'P/N' | 'P-N' | 'PN'
export type Series = {
  key: string
  label: string
  prefix: string
  layout: Layout
  digits: number
  yearly: boolean
  financialYear: string
  lastNumber: number
  nextNumber: number
  nextDocNo: string
}
export type LayoutOption = { key: Layout; yearly: boolean; label: string }
export type NumberingData = { items: Series[]; layouts: LayoutOption[]; financialYear: string }

export const numberingApi = {
  list: () => api.get<NumberingData>('/settings/numbering'),
  setNext: (key: string, nextNumber: number) => api.put<NumberingData>('/settings/numbering', { key, nextNumber }),
  saveFormat: (key: string, body: { prefix: string; layout: Layout; digits: number }) => api.put<NumberingData>('/settings/numbering/format', { key, ...body }),
}

const shortYear = (fy: string) => `${fy.slice(2, 4)}${fy.slice(5, 7)}`

export function previewDocNo(f: { prefix: string; layout: Layout; digits: number }, fy: string, n: number) {
  const p = f.prefix || 'ABC'
  const num = String(n).padStart(f.digits, '0')
  switch (f.layout) {
    case 'P/FYS/N': return `${p}/${shortYear(fy)}/${num}`
    case 'N/FYS-P': return `${num}/${shortYear(fy)}-${p}`
    case 'P-FYS-N': return `${p}-${shortYear(fy)}-${num}`
    case 'P/N': return `${p}/${num}`
    case 'P-N': return `${p}-${num}`
    case 'PN': return `${p}${num}`
    default: return `${p}/${fy}/${num}`
  }
}
