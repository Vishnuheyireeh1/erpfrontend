import { useState } from 'react'

// Newest first (default) / oldest first for a dated list — remembered per list on this computer.
export type ListOrder = 'newest' | 'oldest'

export function useListOrder(list: string): [ListOrder, (o: ListOrder) => void] {
  const key = `sairandhri.order.${list}`
  const [order, setOrder] = useState<ListOrder>(() => {
    try {
      return localStorage.getItem(key) === 'oldest' ? 'oldest' : 'newest'
    } catch {
      return 'newest'
    }
  })
  const set = (o: ListOrder) => {
    setOrder(o)
    try {
      localStorage.setItem(key, o)
    } catch {
      // private window / storage blocked — the choice just isn't remembered
    }
  }
  return [order, set]
}

// Rows already loaded in full (statements, day book …) shown in the chosen order.
export const inOrder = <T,>(rows: T[], order: ListOrder, loadedAs: ListOrder) => (order === loadedAs ? rows : [...rows].reverse())
