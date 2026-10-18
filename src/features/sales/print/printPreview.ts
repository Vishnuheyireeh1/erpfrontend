import { api } from '@/lib/api'

// Print preview for direct printing, laid out like Chrome's print window: the sheets on the left (true paper shape,
// 6 lines per inch, shop name double width — as the dot-matrix prints it), Destination / Copies / Print on the right.
// Nothing is sent until Print is pressed (Enter = Print, Esc = Cancel). Plain DOM so it works from any page.
type Opts = { printer?: string; columns: number; paperWidthIn: number; paperHeightIn: number; feedLines?: number }
export type PrintChoice = { printer: string; copies: number }

const BLUE = '#1a73e8'
function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: Partial<CSSStyleDeclaration> = {}, text?: string) {
  const n = document.createElement(tag)
  Object.assign(n.style, style)
  if (text !== undefined) n.textContent = text
  return n
}
// Same characters the printer gets (rawPrint.ts toAscii).
const ascii = (s: string) => s.replace(/₹/g, 'Rs.').replace(/[—–]/g, '-').replace(/[·•]/g, '.').replace(/×/g, 'x').replace(/[^\x20-\x7e\n]/g, '?')

function sheets(text: string, o: Opts, maxWidthPx: number) {
  const lines = ascii(text).split('\n').map((l) => l.replace(/\s+$/, ''))
  const perSheet = o.paperHeightIn > 0 ? Math.round(o.paperHeightIn * 6) : lines.length + (o.feedLines ?? 6)
  const k = Math.max(60, Math.min(140, maxWidthPx / o.paperWidthIn)) // px per inch (never too small on a tiny screen)
  const pad = 0.1 * k
  const font = (o.paperWidthIn * k - 2 * pad) / o.columns / 0.6
  const first = lines.findIndex((l) => l.trim())
  const out: HTMLElement[] = []
  for (let s = 0; s * perSheet < lines.length; s++) {
    const page = el('div', {
      width: `${o.paperWidthIn * k}px`, height: `${(perSheet / 6) * k}px`, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,.3)',
      padding: `0 ${pad}px`, boxSizing: 'border-box', overflow: 'hidden', flex: 'none', color: '#000',
      font: `700 ${font.toFixed(2)}px/${(k / 6).toFixed(2)}px "Courier New", Courier, monospace`, whiteSpace: 'pre',
    })
    lines.slice(s * perSheet, (s + 1) * perSheet).forEach((l, i) => {
      const row = el('div', { height: `${(k / 6).toFixed(2)}px` })
      const name = l.trim()
      if (s * perSheet + i === first && name.length * 2 <= o.columns) {
        row.textContent = ' '.repeat(Math.floor((o.columns - name.length * 2) / 2))
        row.append(el('span', { display: 'inline-block', transform: 'scaleX(2)', transformOrigin: 'left' }, name))
      } else row.textContent = l || ' '
      page.append(row)
    })
    out.push(page)
  }
  return out
}

export function printPreview(text: string, o: Opts) {
  return new Promise<PrintChoice | null>((resolve) => {
    const narrow = window.innerWidth < 760
    const shade = el('div', { position: 'fixed', inset: '0', zIndex: '9998', background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: narrow ? '0' : '24px' })
    const box = el('div', {
      background: '#fff', color: '#202124', width: narrow ? '100%' : 'min(1100px, 100%)', height: narrow ? '100%' : 'min(720px, 100%)', borderRadius: narrow ? '0' : '8px',
      display: 'flex', flexDirection: narrow ? 'column' : 'row', overflow: 'hidden', font: '14px Inter, system-ui, sans-serif', boxShadow: '0 12px 40px rgba(0,0,0,.4)',
    })
    box.setAttribute('role', 'dialog')
    box.setAttribute('aria-modal', 'true')
    box.setAttribute('aria-label', 'Print')

    // Left: the sheets.
    const view = el('div', { flex: '1', minHeight: '0', overflow: 'auto', background: '#525659', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' })
    // Sheet width = the space left of the panel (dialog width − panel − padding − scrollbar).
    const pages = sheets(text, o, (narrow ? window.innerWidth : Math.min(1100, window.innerWidth - 48) - 320) - 56)
    view.append(...pages)

    // Right: Chrome-like panel.
    const side = el('div', { width: narrow ? '100%' : '320px', flex: 'none', display: 'flex', flexDirection: 'column', borderLeft: narrow ? '0' : '1px solid #dadce0', borderTop: narrow ? '1px solid #dadce0' : '0' })
    const head = el('div', { padding: '18px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' })
    head.append(el('div', { fontSize: '20px' }, 'Print'), el('div', { color: '#5f6368', fontSize: '13px' }, `${pages.length} sheet${pages.length > 1 ? 's' : ''} of paper`))
    const body = el('div', { padding: '8px 20px', display: 'grid', gridTemplateColumns: '100px 1fr', gap: '14px 12px', alignItems: 'center', flex: '1', alignContent: 'start' })
    const field = { padding: '7px 8px', border: '1px solid #dadce0', borderRadius: '4px', font: '14px Inter, system-ui, sans-serif', width: '100%', boxSizing: 'border-box', background: '#fff', color: '#202124' } as const
    const dest = el('select', field)
    const add = (name: string) => dest.append(Object.assign(document.createElement('option'), { value: name, textContent: name }))
    if (o.printer) add(o.printer)
    api.get<{ items: string[] }>('/system/printers').then((r) => r.items.filter((n) => n !== o.printer).forEach(add)).catch(() => {})
    const copies = Object.assign(el('input', field), { type: 'number', min: '1', max: '5', value: '1' })
    const label = (t: string) => el('div', { color: '#5f6368' }, t)
    body.append(label('Destination'), dest, label('Copies'), copies, label('Paper'), el('div', {}, `${o.paperWidthIn} × ${o.paperHeightIn || 'roll'} in`))
    if (o.paperHeightIn > 0 && pages.length > 1) body.append(el('div', { gridColumn: '1 / -1', color: '#b5121b', fontSize: '13px' }, 'This bill is longer than one sheet — it goes onto the next sheet.'))

    const foot = el('div', { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 20px', borderTop: '1px solid #dadce0' })
    const btn = (t: string, primary: boolean) => {
      const b = el('button', { padding: '8px 22px', borderRadius: '4px', cursor: 'pointer', font: '500 14px Inter, system-ui, sans-serif', border: primary ? `1px solid ${BLUE}` : '1px solid #dadce0', background: primary ? BLUE : '#fff', color: primary ? '#fff' : BLUE })
      b.type = 'button'
      b.textContent = t
      return b
    }
    const print = btn('Print', true)
    const cancel = btn('Cancel', false)
    foot.append(print, cancel)
    side.append(head, body, foot)
    box.append(view, side)
    shade.append(box)
    document.body.appendChild(shade)
    print.focus()

    const done = (ok: boolean) => {
      document.removeEventListener('keydown', onKey, true)
      shade.remove()
      resolve(ok ? { printer: dest.value, copies: Math.min(5, Math.max(1, Math.round(Number(copies.value)) || 1)) } : null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false) }
      else if (e.key === 'Enter' && e.target !== dest) { e.preventDefault(); e.stopPropagation(); done(true) }
    }
    document.addEventListener('keydown', onKey, true)
    print.onclick = () => done(true)
    cancel.onclick = () => done(false)
    shade.onclick = (e) => { if (e.target === shade) done(false) }
  })
}
