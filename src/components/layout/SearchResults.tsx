import { IconFileInvoice, IconNeedleThread, IconPackage, IconUser } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import type { SearchData } from './searchHits'

const STAGE: Record<string, string> = { PENDING: 'Booked', CUTTING: 'Cutting', STITCHING: 'Stitching', TRIAL: 'Trial', READY: 'Ready', DELIVERED: 'Handed over' }

type Props = { data: SearchData; active: string; onPick: (to: string) => void }
type RowProps = { k: string; to: string; icon: ReactNode; title: string; sub: string; right?: ReactNode; active: string; onPick: (to: string) => void }

function Row({ k, to, icon, title, sub, right, active, onPick }: RowProps) {
  return (
    <li>
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(to)}
        className={cn('flex w-full items-center gap-3 rounded-control px-3 py-2 text-left', active === k ? 'bg-brand-tint' : 'hover:bg-page')}>
        <span className="shrink-0 text-muted">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{title}</span>
          <span className="block truncate text-xs text-muted">{sub}</span>
        </span>
        {right && <span className="shrink-0 text-right text-xs">{right}</span>}
      </button>
    </li>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <div className="py-1"><p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p><ul>{children}</ul></div>
}

// Top-bar search dropdown: customers, stitching jobs, bills and products — grouped, one tap opens it.
export function SearchResults({ data, active, onPick }: Props) {
  const empty = !data.customers.length && !data.jobs.length && !data.bills.length && !data.products.length
  const pick = { active, onPick }

  if (empty) return <p className="px-3 py-4 text-sm text-muted">Nothing found. Try the phone number, a name, or a job / bill number.</p>
  return (
    <div className="divide-y divide-line">
      {data.customers.length > 0 && (
        <Group title="Customers">
          {data.customers.map((c) => (
            <Row key={c.id} {...pick} k={`c${c.id}`} to={`/customers/${c.id}`} icon={<IconUser size={18} />} title={c.name} sub={`${c.phone ?? 'no phone'} · ${c.code}`}
              right={c.balance > 0.004 ? <span className="text-warn">owes {formatINR(c.balance)}</span> : c.balance < -0.004 ? <span className="text-success">advance {formatINR(-c.balance)}</span> : null} />
          ))}
        </Group>
      )}
      {data.jobs.length > 0 && (
        <Group title="Stitching jobs">
          {data.jobs.map((j) => (
            <Row key={j.id} {...pick} k={`j${j.id}`} to={`/jobs/${j.id}`} icon={<IconNeedleThread size={18} />} title={`${j.docNo} · ${j.customerName}`} sub={`${j.garments} · ready by ${formatDate(j.expectedDate)}`}
              right={<><span className={j.status === 'READY' ? 'font-medium text-success' : 'text-ink-soft'}>{STAGE[j.status] ?? j.status}</span>{j.due > 0.004 && <span className="block text-warn">to collect {formatINR(j.due)}</span>}</>} />
          ))}
        </Group>
      )}
      {data.bills.length > 0 && (
        <Group title="Bills">
          {data.bills.map((b) => (
            <Row key={b.id} {...pick} k={`b${b.id}`} to={`/sales/${b.id}`} icon={<IconFileInvoice size={18} />} title={b.docNo} sub={`${b.customerName} · ${formatDate(b.docDate)}${b.status === 'CANCELLED' ? ' · cancelled' : ''}`} right={formatINR(Number(b.grandTotal))} />
          ))}
        </Group>
      )}
      {data.products.length > 0 && (
        <Group title="Products">
          {data.products.map((p) => (
            <Row key={p.id} {...pick} k={`p${p.id}`} to={`/products/${p.id}`} icon={<IconPackage size={18} />} title={p.name} sub={`${p.code} · ${formatINR(p.price)}`}
              right={<span className={p.stock > 0 ? 'text-ink-soft' : 'text-danger'}>{p.stock > 0 ? `${p.stock} ${p.unit} in stock` : 'Out of stock'}</span>} />
          ))}
        </Group>
      )}
    </div>
  )
}
