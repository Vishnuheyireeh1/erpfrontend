import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { staffApi } from '@/features/staff/api/staff.api'
import { costCategoryApi, type TailorOption } from '@/features/workshop/api/workshop.api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import type { PieceDraft } from '../orderDrafts'

type Props = { draft: PieceDraft; workers: TailorOption[]; onChange: (patch: Partial<PieceDraft>) => void }

// Brand order piece, under the tailor: the cutting master and who measured.
//   Cutting master = people who do "Cutting" work (Staff & salary); per-piece → their usual cutting pay fills in
//   (change it here, like the tailor pay); salaried → empty = only who did it, an amount = extra pay on top of salary.
//   Saved as the piece's Cutting work line.
//   Measured by = any staff member (optional).
export function BrandCuttingFields({ draft, workers, onChange }: Props) {
  const cats = useApiQuery('cost-categories', () => costCategoryApi.list())
  const staff = useApiQuery('staff-options', () => staffApi.options())
  const cutWork = (cats.data ?? []).find((c) => /^cutting$/i.test(c.name))
  const doers = cutWork ? workers.filter((w) => w.works.some((x) => x.categoryId === cutWork.id)) : []
  // Nobody ticked for Cutting yet → everyone; the one already chosen always stays in the list.
  const people = doers.length ? workers.filter((w) => doers.includes(w) || String(w.id) === draft.cutTailorId) : workers
  const usual = (id: string) => String(Number(workers.find((w) => String(w.id) === id)?.works.find((x) => x.categoryId === cutWork?.id)?.rate ?? 0) || '')
  const who = workers.find((w) => String(w.id) === draft.cutTailorId)
  const perPiece = who?.payType === 'PIECE'
  const pay = (Number(draft.qty) || 0) * (Number(draft.cutRate) || 0)

  return (
    <>
      <Select
        label="Cutting master"
        value={draft.cutTailorId}
        onChange={(e) => onChange({ cutTailorId: e.target.value, cutRate: e.target.value ? usual(e.target.value) : '' })}
        options={[{ value: '', label: 'Not decided' }, ...people.map((p) => ({ value: String(p.id), label: `${p.name}${p.payType === 'SALARY' ? ' (salaried)' : ''}` }))]}
      />
      {who && (
        <Input label="Cutting pay / piece ₹" type="number" inputMode="decimal" min={0} value={Number(draft.cutRate) ? draft.cutRate : ''} placeholder={perPiece ? '0' : 'Optional'} onChange={(e) => onChange({ cutRate: e.target.value })}
          hint={pay > 0 ? `${who.name} gets ${formatINR(pay)}${perPiece ? '' : ' on top of salary'} — not on the bill` : perPiece ? 'Not on the bill' : 'Salaried — leave empty for no extra pay'} />
      )}
      <Select
        label="Measured by"
        value={draft.measuredById ?? ''}
        onChange={(e) => onChange({ measuredById: e.target.value })}
        options={[{ value: '', label: 'Not recorded' }, ...(staff.data ?? []).map((s) => ({ value: String(s.id), label: `${s.name}${s.role ? ` · ${s.role}` : ''}` }))]}
      />
    </>
  )
}
