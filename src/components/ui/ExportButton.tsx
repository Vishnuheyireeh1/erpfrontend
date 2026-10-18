import { IconFileSpreadsheet } from '@tabler/icons-react'
import { useState } from 'react'
import { AUTH_EXPIRED_EVENT } from '@/lib/api'
import { Button } from './Button'
import { useToast } from './toast-context'

type Params = Record<string, string | number | boolean | undefined | null>

type Props = {
  path: string // API path, e.g. "/products/export"
  params?: Params // the list's current filters → the file matches what's on screen
  label?: string
}

function query(params: Params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

// "Download Excel" for any list. The server builds the file with the same filters as the screen.
export function ExportButton({ path, params, label = 'Excel' }: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api${path}${query(params)}`, { credentials: 'include' })
      if (res.status === 401) {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Could not download the file')
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'export.xlsx'
      const url = URL.createObjectURL(await res.blob())
      Object.assign(document.createElement('a'), { href: url, download: name }).click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download the file')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button icon={IconFileSpreadsheet} loading={busy} onClick={download} title="Download as Excel">
      {label}
    </Button>
  )
}
