import { Fragment } from 'react'
import { itemTitle } from '@/features/inventory/constants'
import type { CostDraft, ItemDraft } from '@/features/jobs/jobDrafts'
import { formatINR } from '@/lib/format'
import type { SaleLineDraft } from './SaleLineRow'

type Props = {
  lines: SaleLineDraft[]
  amountOf: (l: SaleLineDraft, i: number) => number | undefined // after the line discount; undefined = not billed
  stitch: ItemDraft[]
  charges: CostDraft[]
}

const qtyText = (q: string) => String(Number(q) || 0)

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul className="flex flex-col gap-1 text-sm">{children}</ul>
    </div>
  )
}
const Line = ({ name, detail, amount }: { name: string; detail: string; amount: string }) => (
  <li className="flex items-baseline justify-between gap-3">
    <span className="min-w-0"><span className="text-ink">{name}</span> <span className="text-xs text-muted">{detail}</span></span>
    <span className="shrink-0 font-medium text-ink">{amount}</span>
  </li>
)

// Billing page, above the totals: everything on this bill at a glance — items bought, garments to stitch,
// additional charges — so the counter can read it out before taking the payment.
export function BillSummary({ lines, amountOf, stitch, charges }: Props) {
  const extra = charges.filter((c) => c.kind.trim() || Number(c.charge) > 0)
  if (!lines.length && !stitch.length) return null
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-line pb-4">
      <p className="text-sm font-semibold text-ink">Bill summary</p>
      {lines.length > 0 && (
        <Group title={`Items (${lines.length})`}>
          {lines.map((l, i) => {
            const amt = amountOf(l, i)
            return <Line key={l.key} name={itemTitle(l.item)} detail={`${qtyText(l.qty)} × ${formatINR(Number(l.rate) || 0)}${Number(l.discountPct) > 0 ? ` − ${Number(l.discountPct)}%` : ''}`}
              amount={l.included || amt === undefined ? 'for stitching' : formatINR(amt)} />
          })}
        </Group>
      )}
      {stitch.length > 0 && (
        <Group title={`Stitching (${stitch.length})`}>
          {stitch.map((d) => (
            <Fragment key={d.key}>
              <Line name={d.description || 'Garment'} detail={`${qtyText(d.qty)} × ${formatINR(Number(d.chargeRate) || 0)}`} amount={formatINR((Number(d.qty) || 0) * (Number(d.chargeRate) || 0))} />
              {(d.charges ?? []).filter((c) => Number(c.amount) > 0).map((c) => (
                <Line key={c.key} name={`+ ${c.name.trim() || 'Charge'}`} detail={`for ${d.description || 'garment'}`} amount={formatINR(Number(c.amount))} />
              ))}
            </Fragment>
          ))}
        </Group>
      )}
      {extra.length > 0 && (
        <Group title="Additional charges">
          {extra.map((c) => <Line key={c.key} name={c.kind.trim() || 'Charge'} detail={c.description ? `for ${c.description}` : ''} amount={formatINR(Number(c.charge) || 0)} />)}
        </Group>
      )}
    </div>
  )
}
