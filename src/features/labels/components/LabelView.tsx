import type { StockItem } from '@/features/inventory/types'
import type { LabelLayout } from '../layouts'
import { BarcodeSvg } from './BarcodeSvg'

export type PriceMode = 'mrp' | 'selling' | 'none'
export type LabelOptions = { shopName: string; showShop: boolean; priceMode: PriceMode }

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function priceText(item: StockItem, mode: PriceMode) {
  if (mode === 'none') return null
  const mrp = item.mrp ? Number(item.mrp) : null
  if (mode === 'mrp' && mrp) return `MRP ${inr(mrp)}`
  return inr(Number(item.sellingPrice))
}

// One sticker. Black only (thermal printers print one colour); sizes scale with the label height.
export function LabelView({ item, layout, options }: { item: StockItem; layout: LabelLayout; options: LabelOptions }) {
  const { width, height } = layout.label
  const s = Math.min(height / 25, width / 50) // 1 = the 50 × 25 mm label; narrower or taller labels scale to fit
  const price = priceText(item, options.priceMode)
  const text = (mm: number) => `${(mm * s).toFixed(2)}mm`

  return (
    <div
      style={{
        width: `${width}mm`,
        height: `${height}mm`,
        padding: `${text(1.2)} ${text(1.6)}`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        color: '#000',
        background: '#fff',
        fontFamily: 'Inter Variable, Arial, sans-serif',
        lineHeight: 1.15,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1mm' }}>
        {options.showShop && (
          <span style={{ fontSize: text(2.2), fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {options.shopName}
          </span>
        )}
        {item.size && <span style={{ fontSize: text(2.6), fontWeight: 700, marginLeft: 'auto' }}>{item.size.name}</span>}
      </div>
      <div style={{ fontSize: text(2.4), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.product.name}
        {item.colour && <span> · {item.colour.name}</span>}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 0, padding: `${text(0.4)} 0` }}>
        <BarcodeSvg value={item.barcode} heightMm={Math.max(6, height * 0.42)} fontPx={Math.max(8, 10 * s)} />
      </div>
      {price && (
        <div style={{ fontSize: text(3.2), fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{price}</div>
      )}
    </div>
  )
}
