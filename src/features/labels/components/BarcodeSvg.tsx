import JsBarcode from 'jsbarcode'
import { useLayoutEffect, useRef } from 'react'

// Valid EAN-13 (our generated "20…" codes, most brand codes) → EAN-13 symbol; anything else → Code 128.
function formatFor(code: string) {
  if (!/^\d{13}$/.test(code)) return 'CODE128'
  const sum = [...code.slice(0, 12)].reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10 === Number(code[12]) ? 'EAN13' : 'CODE128'
}

type Props = { value: string; heightMm: number; fontPx?: number }

// Vector barcode that stretches to the label width (prints sharp on any printer).
export function BarcodeSvg({ value, heightMm, fontPx = 11 }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, value, {
        format: formatFor(value),
        width: 2,
        height: 60,
        margin: 0,
        displayValue: true,
        fontSize: fontPx * 2,
        textMargin: 0,
        font: 'Inter Variable, Arial, sans-serif',
        flat: true, // EAN-13 without the long guard bars → more room for the digits
      })
      // Fill the label width; keep bar proportions horizontally (scanners only need relative widths).
      ref.current.setAttribute('preserveAspectRatio', 'none')
      ref.current.removeAttribute('width')
      ref.current.removeAttribute('height')
    } catch {
      ref.current.innerHTML = ''
    }
  }, [value, fontPx])

  return <svg ref={ref} role="img" aria-label={`Barcode ${value}`} style={{ width: '100%', height: `${heightMm}mm`, display: 'block' }} />
}
