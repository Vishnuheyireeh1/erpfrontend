import { api, ApiError, AUTH_EXPIRED_EVENT } from '@/lib/api'
import type { PrintSettings } from '../types'
import { printPreview } from './printPreview'

// Prints a bill. "direct": the text goes straight to the dot-matrix printer (its own font — dark and sharp, no print
// window). Otherwise: monospace text through the browser's print dialog (font sized so `columns` fill the width).
export function printText(text: string, s: PrintSettings) {
  if (s.mode === 'direct') {
    // Preview first — prints only after "Print" is pressed.
    void printPreview(text, s).then((choice) => {
      if (!choice) return
      const note = notice(`Printing on ${choice.printer || 'the bill printer'}…`)
      api.post('/system/print', { text, ...choice })
        .then(() => note('Sent to the printer ✓', 'ok'))
        .catch((err) => note(`Bill not printed: ${err instanceof ApiError ? err.message : 'printer problem'}`, 'error'))
    })
    return
  }
  const widthPt = s.paperWidthIn * 72 - 18 // small safety margin
  const fontPt = Math.min(14, Math.max(6, widthPt / (s.columns * 0.6)))
  // Height 0 = roll paper (thermal receipt printer): the page is just as long as the bill — no blank paper fed.
  const lines = text.split('\n').length
  const rollIn = Math.max(2, (lines * fontPt * 1.15) / 72 + 0.6)
  // A page wider than tall makes Chrome turn it sideways (landscape) on the dot-matrix — keep it upright (portrait).
  const heightIn = Math.max(s.paperHeightIn > 0 ? s.paperHeightIn : rollIn, s.paperWidthIn + 0.1)
  const size = `${s.paperWidthIn}in ${heightIn.toFixed(2)}in`
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Bold monospace: dot-matrix printers print thin fonts very light.
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>&nbsp;</title><style>
    @page { size: ${size}; margin: 0.1in 0.12in; }
    html, body { margin: 0; background: #fff; }
    pre { font-family: "Courier New", Courier, monospace; font-weight: 700; font-size: ${fontPt.toFixed(2)}pt; line-height: 1.15; margin: 0; color: #000; white-space: pre; }
  </style></head><body><pre>${esc}</pre></body></html>`

  // One print frame at a time — an earlier bill left on the page can never be printed by mistake.
  document.querySelectorAll('iframe[data-print-frame]').forEach((f) => f.remove())
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('data-print-frame', '')
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
  const win = frame.contentWindow!
  win.focus()
  win.print()
  // Remove after the dialog closes (print() blocks in most browsers; the timeout covers the rest).
  window.setTimeout(() => frame.remove(), 60_000)
}

// Downloads (or opens) a file from the API, e.g. the bill PDF.
export async function fetchFile(path: string, open = false) {
  const res = await fetch(`/api${path}`, { credentials: 'include' })
  if (res.status === 401) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    return
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message ?? 'Could not get the file')
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'file'
  const url = URL.createObjectURL(await res.blob())
  if (open) window.open(url, '_blank', 'noopener')
  else Object.assign(document.createElement('a'), { href: url, download: name }).click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// Small message at the bottom of the screen for direct printing (works from any page, no React needed):
// "Printing…" → "Sent to the printer ✓" (or the reason it failed, which stays until tapped).
function notice(text: string) {
  const box = document.createElement('div')
  box.setAttribute('role', 'status')
  Object.assign(box.style, {
    position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: '9999', maxWidth: '90vw',
    padding: '10px 16px', borderRadius: '10px', font: '500 14px Inter, system-ui, sans-serif', color: '#fff', background: '#1a1a1d',
    boxShadow: '0 6px 20px rgba(0,0,0,.25)', cursor: 'pointer',
  })
  box.textContent = text
  box.onclick = () => box.remove()
  document.body.appendChild(box)
  return (next: string, kind: 'ok' | 'error') => {
    box.textContent = next
    box.style.background = kind === 'ok' ? '#15803d' : '#b5121b'
    if (kind === 'ok') window.setTimeout(() => box.remove(), 2500)
  }
}
