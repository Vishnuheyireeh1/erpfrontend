import type { StockItem } from '@/features/inventory/types'

// Label sheet / roll layouts. All sizes in millimetres.
// Roll sizes match the recommended printer (50 × 25 mm); adjust here once the client buys labels.

export type LabelLayout = {
  id: string
  name: string
  hint: string
  page: { width: number; height: number } // one printed page (a roll "page" = one row of labels)
  label: { width: number; height: number }
  cols: number
  rows: number
  margin: { top: number; left: number }
  gap: { x: number; y: number }
  sheet: boolean // A4 sheet → "skip used labels" makes sense
  receipt?: boolean // receipt-printer roll: the paper is cut to the labels printed (no blank paper)
}

export const labelLayouts: LabelLayout[] = [
  {
    id: 'roll-50x25',
    name: 'Label printer · 50 × 25 mm',
    hint: 'Recommended — one label per row (TVS LP 46 / TSC TE244 / Zebra ZD230)',
    page: { width: 50, height: 25 },
    label: { width: 50, height: 25 },
    cols: 1, rows: 1, margin: { top: 0, left: 0 }, gap: { x: 0, y: 0 }, sheet: false,
  },
  {
    id: 'roll-38x25-2up',
    name: 'Label printer · 38 × 25 mm, 2 per row',
    hint: 'Cheaper 2-across roll (about 80 mm wide)',
    page: { width: 80, height: 25 },
    label: { width: 38, height: 25 },
    cols: 2, rows: 1, margin: { top: 0, left: 1.5 }, gap: { x: 1, y: 0 }, sheet: false,
  },
  // 80 mm thermal RECEIPT printers (e.g. WeP Hooka Skripta TH80): prints 72 mm wide in the middle of the roll.
  // Use an 80 mm thermal STICKER roll to stick the labels; on normal receipt paper they print but don't stick.
  {
    id: 'thermal-80-2x6',
    name: 'Thermal receipt printer 80 mm · 12 labels (2 × 6)',
    hint: 'Receipt printer like WeP TH80 — 2 labels per row, 12 per print. Use an 80 mm sticker roll.',
    page: { width: 80, height: 152 },
    label: { width: 35, height: 25 },
    cols: 2, rows: 6, margin: { top: 1, left: 4 }, gap: { x: 2, y: 0 }, sheet: false, receipt: true,
  },
  {
    id: 'thermal-80-1x6',
    name: 'Thermal receipt printer 80 mm · 6 big labels (1 × 6)',
    hint: 'Receipt printer — one wide label per row (72 × 25 mm), easiest to scan',
    page: { width: 80, height: 152 },
    label: { width: 72, height: 25 },
    cols: 1, rows: 6, margin: { top: 1, left: 4 }, gap: { x: 0, y: 0 }, sheet: false, receipt: true,
  },
  {
    id: 'a4-12',
    name: 'A4 paper · 12 labels (3 × 4)',
    hint: 'Any normal printer on plain paper or a 12-label sheet — cut and stick',
    page: { width: 210, height: 297 },
    label: { width: 66, height: 70 },
    cols: 3, rows: 4, margin: { top: 8.5, left: 6 }, gap: { x: 0, y: 0 }, sheet: true,
  },
  {
    id: 'a4-24',
    name: 'A4 sticker sheet · 24 labels (70 × 37 mm)',
    hint: 'Common Indian sticker sheet — 3 × 8 labels',
    page: { width: 210, height: 297 },
    label: { width: 70, height: 37.1 },
    cols: 3, rows: 8, margin: { top: 0, left: 0 }, gap: { x: 0, y: 0 }, sheet: true,
  },
  {
    id: 'a4-40',
    name: 'A4 sticker sheet · 40 labels (52.5 × 29.7 mm)',
    hint: 'Any normal printer — 4 × 10 labels, no margins',
    page: { width: 210, height: 297 },
    label: { width: 52.5, height: 29.7 },
    cols: 4, rows: 10, margin: { top: 0, left: 0 }, gap: { x: 0, y: 0 }, sheet: true,
  },
  {
    id: 'a4-65',
    name: 'A4 sticker sheet · 65 labels (38.1 × 21.2 mm)',
    hint: 'Any normal printer — 5 × 13 small labels',
    page: { width: 210, height: 297 },
    label: { width: 38.1, height: 21.2 },
    cols: 5, rows: 13, margin: { top: 10.7, left: 4.7 }, gap: { x: 2.5, y: 0 }, sheet: true,
  },
]

export const layoutById = (id: string) => labelLayouts.find((l) => l.id === id) ?? labelLayouts[0]

export const perPage = (l: LabelLayout) => l.cols * l.rows

// Receipt printers (80 mm roll): one page just as long as the labels printed (up to 40 rows a page) — no long blank paper.
export function fitReceipt(l: LabelLayout, count: number): LabelLayout {
  if (!l.receipt) return l
  const rows = Math.min(40, Math.max(1, Math.ceil(count / l.cols)))
  return { ...l, rows, page: { width: l.page.width, height: Math.round((l.margin.top * 2 + rows * l.label.height) * 10) / 10 } }
}

export const MAX_LABELS = 3000 // keeps the browser responsive while printing

// Splits the label list into pages (with leading skipped slots on A4 sheets).
export function paginate(labels: StockItem[], layout: LabelLayout, skip: number) {
  const slots: (StockItem | null)[] = [...Array(layout.sheet ? skip : 0).fill(null), ...labels]
  const size = perPage(layout)
  const pages: (StockItem | null)[][] = []
  for (let i = 0; i < slots.length; i += size) pages.push(slots.slice(i, i + size))
  return pages
}
