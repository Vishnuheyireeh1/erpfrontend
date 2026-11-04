import { useRef } from 'react'
import { staffApi } from '@/features/staff/api/staff.api'
import { tailorApi, type TailorOption } from '@/features/workshop/api/workshop.api'
import { useApiQuery } from '@/lib/useApiQuery'

export type WorkPerson = TailorOption & { role?: string }

// Assign workers (Stitching, Cutting, Embroidery …): every staff member with their designation, not only those ticked for
// that work. Someone with no worker profile yet is listed with id = −(staff id); saving makes their profile (see resolve).
export function useWorkPeople(workers: TailorOption[]) {
  const made = useRef(new Map<number, Promise<number>>()) // one person on several rows → one profile
  const staff = useApiQuery('staff-options', () => staffApi.options())
  const people: WorkPerson[] = (staff.data ?? []).map((s) => {
    const w = workers.find((x) => x.staffId === s.id)
    return w
      ? { ...w, role: s.role }
      : { id: -s.id, code: s.code, name: s.name, role: s.role, payType: Number(s.salary) > 0 || Number(s.dayRate) > 0 ? 'SALARY' : 'PIECE', stitches: true, speciality: s.role, staffId: s.id, rates: [], works: [] }
  })
  // Workers not linked to a staff record stay on the list.
  const others = workers.filter((w) => !w.staffId)
  return {
    people: [...people, ...others],
    resolve: async (id: string) => {
      if (!id) return null
      const n = Number(id)
      if (n > 0) return n
      if (!made.current.has(n)) made.current.set(n, tailorApi.fromStaff(-n).then((w) => w.id))
      return made.current.get(n)!
    },
  }
}
