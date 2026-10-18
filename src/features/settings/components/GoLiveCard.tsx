import { IconCircleCheck, IconCircleDashed, IconInfoCircle } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Feedback'
import { cn } from '@/lib/cn'
import type { ChecklistItem } from '../api/system.api'

const icons = {
  done: <IconCircleCheck size={20} className="shrink-0 text-success" aria-label="Done" />,
  todo: <IconCircleDashed size={20} className="shrink-0 text-warn" aria-label="To do" />,
  info: <IconInfoCircle size={20} className="shrink-0 text-info" aria-label="Check" />,
}

type Props = { data: { items: ChecklistItem[]; done: number; todo: number } | null }

// Settings → "Go-live checklist": what must be ready before real billing starts.
export function GoLiveCard({ data }: Props) {
  return (
    <Card title="Go-live checklist" actions={data && <span className={cn('text-sm font-medium', data.todo ? 'text-warn' : 'text-success')}>{data.todo ? `${data.todo} to do` : 'All ready'}</span>}>
      {!data ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((i) => (
            <li key={i.key} className="flex gap-3">
              {icons[i.status]}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  {i.link ? <Link to={i.link} className="hover:text-brand">{i.title}</Link> : i.title}
                </span>
                <span className="block break-words text-xs text-muted">{i.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
