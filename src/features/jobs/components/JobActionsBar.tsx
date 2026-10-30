import type { Icon } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'

export type JobAction = { label: string; icon: Icon; onClick: () => void; hidden?: boolean; loading?: boolean }
type Props = { work: JobAction[]; prints: JobAction[]; cancel?: JobAction }

// Job page: every action as a button on its own row under the title (not squeezed beside it) —
// job work first, then the papers to print / download, Cancel at the far right.
export function JobActionsBar({ work, prints, cancel }: Props) {
  const show = (list: JobAction[]) => list.filter((a) => !a.hidden).map((a) => (
    <Button key={a.label} size="sm" icon={a.icon} loading={a.loading} onClick={a.onClick}>{a.label}</Button>
  ))
  const workBtns = show(work)
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-line bg-card p-2">
      {workBtns}
      {workBtns.length > 0 && <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />}
      {show(prints)}
      {cancel && !cancel.hidden && (
        <Button size="sm" variant="danger" icon={cancel.icon} onClick={cancel.onClick} className="sm:ml-auto">{cancel.label}</Button>
      )}
    </div>
  )
}
