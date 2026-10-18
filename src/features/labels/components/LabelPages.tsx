import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { StockItem } from '@/features/inventory/types'
import type { LabelLayout } from '../layouts'
import { LabelView, type LabelOptions } from './LabelView'

// One printed page with labels placed at exact millimetre positions. null = skipped (already-used sticker).
export function LabelPage({ slots, layout, options }: { slots: (StockItem | null)[]; layout: LabelLayout; options: LabelOptions }) {
  const { page, label, margin, gap, cols } = layout
  return (
    <div className="label-page" style={{ position: 'relative', width: `${page.width}mm`, height: `${page.height}mm`, background: '#fff', overflow: 'hidden' }}>
      {slots.map((item, i) =>
        item ? (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${margin.left + (i % cols) * (label.width + gap.x)}mm`,
              top: `${margin.top + Math.floor(i / cols) * (label.height + gap.y)}mm`,
            }}
          >
            <LabelView item={item} layout={layout} options={options} />
          </div>
        ) : null,
      )}
    </div>
  )
}

type PrintProps = { pages: (StockItem | null)[][]; layout: LabelLayout; options: LabelOptions; onDone: () => void }

// Mounted only while printing: all pages + @page size for the chosen layout; the rest of the app is hidden.
export function PrintRoot({ pages, layout, options, onDone }: PrintProps) {
  useEffect(() => {
    const done = () => onDone()
    window.addEventListener('afterprint', done)
    // Let the barcodes render before the print dialog opens.
    const t = window.setTimeout(() => window.print(), 300)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('afterprint', done)
    }
  }, [onDone])

  const css = `
    #label-print-root { display: none; }
    @media print {
      @page { size: ${layout.page.width}mm ${layout.page.height}mm; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body > *:not(#label-print-root) { display: none !important; }
      #label-print-root { display: block; }
      #label-print-root .label-page { break-after: page; page-break-after: always; }
      #label-print-root .label-page:last-child { break-after: auto; page-break-after: auto; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }`

  return createPortal(
    <div id="label-print-root">
      <style>{css}</style>
      {pages.map((slots, i) => (
        <LabelPage key={i} slots={slots} layout={layout} options={options} />
      ))}
    </div>,
    document.body,
  )
}
