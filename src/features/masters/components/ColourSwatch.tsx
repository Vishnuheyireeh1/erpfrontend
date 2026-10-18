const RAINBOW = 'conic-gradient(#C62828, #FBC02D, #2E7D32, #1A237E, #6A1B9A, #C62828)'

// Small colour dot. No hex = multicolour (rainbow dot).
export function ColourSwatch({ hex }: { hex?: string | null }) {
  return (
    <span
      className="inline-block size-5 shrink-0 rounded-full border border-line"
      style={{ background: hex || RAINBOW }}
      aria-label={hex ? undefined : 'Multicolour'}
    />
  )
}
