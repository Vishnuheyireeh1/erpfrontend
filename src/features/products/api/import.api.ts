import { ApiError } from '@/lib/api'

export type ImportError = { row: number; column?: string; message: string }

export type ImportCheck = {
  rowCount: number
  productCount: number
  variantCount: number
  stockItems: number // rows with an Opening stock quantity
  stockValue: number
  toCreate: { sizes: string[]; colours: string[] }
  errors: ImportError[]
  errorCount: number
}

export type ImportDone = {
  imported: true
  products: number
  variants: number
  stock: { docNo: string; items: number; value: number } | null // opening stock document made with the import
  created: { sizes: number; colours: number }
}

// Multipart upload (file + option) — returns parsed JSON or throws ApiError.
async function send<T>(path: string, file: File, createMissing: boolean): Promise<T> {
  const body = new FormData()
  body.append('createMissing', String(createMissing))
  body.append('file', file)
  let res: Response
  try {
    res = await fetch(`/api/products${path}`, { method: 'POST', credentials: 'include', body })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the backend is running.")
  }
  const data = await res.json().catch(() => ({}))
  // 422 = file has errors → still a normal "check" result.
  if (!res.ok && res.status !== 422) throw new ApiError(res.status, data.message ?? 'Upload failed')
  return data as T
}

export const importApi = {
  check: (file: File, createMissing: boolean) => send<ImportCheck>('/import/validate', file, createMissing),
  run: (file: File, createMissing: boolean) =>
    send<ImportDone | (ImportCheck & { imported: false })>('/import', file, createMissing),

  // Downloads the Excel template (needs the login cookie, so not a plain link).
  async downloadTemplate() {
    const res = await fetch('/api/products/import/template', { credentials: 'include' })
    if (!res.ok) throw new ApiError(res.status, 'Could not download the template')
    const url = URL.createObjectURL(await res.blob())
    const a = Object.assign(document.createElement('a'), { href: url, download: 'sairandhri-product-import.xlsx' })
    a.click()
    URL.revokeObjectURL(url)
  },
}

// Error list → CSV the user can open in Excel next to their file.
export function downloadErrorsCsv(errors: ImportError[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const lines = ['Row,Column,Problem', ...errors.map((e) => [e.row, esc(e.column ?? ''), esc(e.message)].join(','))]
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'import-errors.csv' })
  a.click()
  URL.revokeObjectURL(url)
}
