// Which billing screen this computer opens: 'steps' (step by step — default, phones / tablets) or 'fast' (keyboard table).
const KEY = 'sairandhri.billing.mode'

export function getBillingMode(): 'steps' | 'fast' {
  try { return localStorage.getItem(KEY) === 'fast' ? 'fast' : 'steps' } catch { return 'steps' }
}
export function setBillingMode(mode: 'steps' | 'fast') {
  try { localStorage.setItem(KEY, mode) } catch { /* private mode — the choice just isn't remembered */ }
}
