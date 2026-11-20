import { mastersApi } from '@/features/masters/api/masters.api'
import type { MasterRow } from '@/features/masters/types'
import type { GarmentType } from '@/features/workshop/types'
import { garmentApi } from '@/features/workshop/api/workshop.api'
import type { ItemDraft } from '@/features/jobs/jobDrafts'
import { useApiQuery } from '@/lib/useApiQuery'

// The work list on a brand order line without a garment: saved Work charges first, then every garment's charges
// (source = where it comes from, used by the "Show" filter).
export type WorkOption = { id?: number; name: string; rate: number; labourRate: number; source: string }

export function workOptions(saved: MasterRow[], garments: GarmentType[]): WorkOption[] {
  const list: WorkOption[] = saved.map((w) => ({ id: w.id, name: w.name, rate: Number(w.rate ?? 0), labourRate: Number(w.labourRate ?? 0), source: 'Work charges' }))
  const seen = new Set(list.map((w) => w.name.toLowerCase()))
  for (const g of garments.filter((x) => x.isActive)) {
    for (const c of g.charges ?? []) {
      if (seen.has(c.name.toLowerCase())) continue
      seen.add(c.name.toLowerCase())
      list.push({ name: c.name, rate: Number(c.rate) || 0, labourRate: 0, source: g.name })
    }
  }
  return list
}

export const findWork = (list: WorkOption[], name: string) => list.find((w) => w.name.toLowerCase() === name.trim().toLowerCase())

// After the order is saved: new work names join Work charges; ticked "save amounts" updates the saved ones.
// A failure here never undoes the order (the next order just won't pre-fill).
export function learnWork(pieces: ItemDraft[], works: WorkOption[]) {
  const done = new Set<string>()
  const calls: Promise<unknown>[] = []
  for (const d of pieces.filter((p) => p.work && p.description.trim())) {
    const name = d.description.trim()
    if (done.has(name.toLowerCase())) continue
    done.add(name.toLowerCase())
    const body = { name, rate: Number(d.chargeRate) || 0, labourRate: Number(d.labourRate) || 0, isActive: true }
    const known = findWork(works, name)
    if (!known) calls.push(mastersApi.create('workCharges', body))
    else if (known.id && d.saveRate) calls.push(mastersApi.update('workCharges', known.id, { ...body, name: known.name }))
  }
  return Promise.allSettled(calls)
}

// Same, when the work list is not loaded on the page (billing): loads it first.
export async function learnWorkNow(lines: ItemDraft[]) {
  if (!lines.some((d) => d.work && d.description.trim())) return
  const [saved, garments] = await Promise.all([mastersApi.options('workCharges').catch(() => []), garmentApi.list().catch(() => [])])
  return learnWork(lines, workOptions(saved, garments))
}

// The work list for a page (Work charges + every garment's charges), loaded once and shared through the query cache.
export function useWorkOptions(garments: GarmentType[] | null | undefined) {
  const saved = useApiQuery('work-charges', () => mastersApi.options('workCharges').catch(() => []))
  return workOptions(saved.data ?? [], garments ?? [])
}

// An empty garment line nobody touched (the job form starts with one) — dropped when a work line is added.
export const blankGarment = (d: ItemDraft) => !d.id && !d.work && !d.garmentTypeId && !d.description.trim() && !d.chargeRate && !Object.values(d.measurements).some(Boolean)
