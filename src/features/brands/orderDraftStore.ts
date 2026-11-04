import type { OrderForm, PieceDraft } from './orderDrafts'

// Brand order form: what is typed stays in this browser until the order is saved, so going to another page (a new garment,
// a new staff member …) and coming back loses nothing. One draft for the new order, one per order being edited.
// An edit draft is dropped once the order was changed elsewhere (updatedAt differs).

export type OrderDraft = { brandId: string; form: OrderForm; pieces: PieceDraft[]; stamp?: string }

const keyOf = (orderId?: number) => `sairandhri.brandOrderDraft.${orderId ?? 'new'}`

export function saveDraft(orderId: number | undefined, draft: OrderDraft) {
  try { localStorage.setItem(keyOf(orderId), JSON.stringify(draft)) } catch { /* browser storage off or full: the form still works */ }
}

export function clearDraft(orderId?: number) {
  try { localStorage.removeItem(keyOf(orderId)) } catch { /* nothing to clear */ }
}

export function loadDraft(orderId?: number, stamp?: string): OrderDraft | null {
  try {
    const d = JSON.parse(localStorage.getItem(keyOf(orderId)) ?? 'null') as OrderDraft | null
    if (!d?.form || !Array.isArray(d.pieces) || !d.pieces.length || d.stamp !== stamp) return null
    // Fresh row keys, so they can't clash with rows added after coming back.
    return {
      ...d,
      pieces: d.pieces.map((p, n) => ({
        ...p, key: `d${n}`,
        charges: (p.charges ?? []).map((c, k) => ({ ...c, key: `dk${n}.${k}` })),
        materials: (p.materials ?? []).map((m, k) => ({ ...m, key: `dm${n}.${k}` })),
      })),
    }
  } catch {
    return null
  }
}

// Same content, whatever the row keys: nothing typed yet = no draft to keep.
export const draftText = (brandId: string, form: OrderForm, pieces: PieceDraft[]) => JSON.stringify({ brandId, form, pieces: pieces.map(({ key: _key, ...p }) => p) })
