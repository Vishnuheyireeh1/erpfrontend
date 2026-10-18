import { useLayoutEffect, useRef, useState } from 'react'
import type { StockItem } from '@/features/inventory/types'
import type { LabelLayout } from '../layouts'
import { LabelPage } from './LabelPages'
import type { LabelOptions } from './LabelView'

const PX_PER_MM = 96 / 25.4

type Props = { pages: (StockItem | null)[][]; layout: LabelLayout; options: LabelOptions }

// On-screen preview at real proportions, scaled to the card width.
// Rolls: first few labels. A4 sheets: the first sheet.
export function LabelPreview({ pages, layout, options }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const shown = pages.slice(0, layout.sheet ? 1 : 6)
  const pagePx = { w: layout.page.width * PX_PER_MM, h: layout.page.height * PX_PER_MM }
  // Rolls are small → show them up to 2.2× bigger; A4 shrinks to fit.
  const scale = width ? Math.min(width / pagePx.w, layout.sheet ? 1 : 2.2) : 0

  return (
    <div ref={boxRef} className="w-full">
      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Add items to see the labels here.</p>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {shown.map((slots, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[4px] shadow-[0_0_0_1px_var(--color-line)]"
              style={{ width: pagePx.w * scale, height: pagePx.h * scale }}
            >
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: pagePx.w, height: pagePx.h }}>
                <LabelPage slots={slots} layout={layout} options={options} />
              </div>
            </div>
          ))}
          {pages.length > shown.length && (
            <p className="text-xs text-muted">+ {(pages.length - shown.length).toLocaleString('en-IN')} more {layout.sheet ? 'sheets' : 'labels'}</p>
          )}
        </div>
      )}
    </div>
  )
}
