import { useState } from 'react'
import { costCategoryApi } from '@/features/workshop/api/workshop.api'
import { useApiQuery } from '@/lib/useApiQuery'

// What a cost is for: pick from the list (only the kinds marked for it — not Cutting, Stitching … which go through Assign
// workers) or type a new one. A typed name is saved with the cost, so next time it is in the list.
export function useCostKind(initial = '') {
  const cats = useApiQuery('cost-categories', () => costCategoryApi.list())
  const [name, setName] = useState(initial)
  const all = cats.data ?? []
  const match = (n: string) => all.find((c) => c.name.toLowerCase() === n.trim().toLowerCase())
  return {
    name,
    setName,
    match,
    names: all.filter((c) => c.isActive && c.showInCosts).map((c) => c.name),
    loading: cats.loading,
    // The category id to save with — a new name is created here.
    resolve: async () => {
      const found = match(name)
      if (!found) return (await costCategoryApi.create({ name: name.trim(), defaultPaidBy: 'PAID', showInCosts: true })).id
      // An existing kind typed here (e.g. Cutting) joins this list too.
      if (!found.showInCosts) await costCategoryApi.update(found.id, { name: found.name, defaultPaidBy: found.defaultPaidBy, sortOrder: found.sortOrder, isActive: true, showInCosts: true })
      return found.id
    },
  }
}
