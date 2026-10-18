import { IconBarcode, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { itemTitle, qtyText } from '@/features/inventory/constants'
import { paymentModeLabels } from '@/features/purchase/api/purchase.api'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { costKindLabels, productionApi } from '../api/production.api'
import type { ProductionLine } from '../types'

const Lines = ({ title, lines, out }: { title: string; lines: ProductionLine[]; out?: boolean }) => (
  <Card title={title} bodyClassName="p-0">
    {lines.length === 0 ? <p className="px-4 py-4 text-sm text-muted">None</p> : (
      <ul className="divide-y divide-line">
        {lines.map((l) => (
          <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
            <Link to={`/stock/items/${l.variantId}`} className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink hover:text-brand">{itemTitle(l.variant)}</span>
              <span className="block font-mono text-xs text-muted">{l.variant.sku}</span>
            </Link>
            <span className="text-sm text-ink-soft">{qtyText(l.qty, l.variant.product.unit.code)}</span>
            <span className="w-28 text-right text-sm">
              <span className="block font-medium text-ink">{formatINR(Number(l.qty) * Number(l.unitCost))}</span>
              <span className="block text-xs text-muted">@ {formatINR(Number(l.unitCost))}{out ? ' / piece' : ''}</span>
            </span>
          </li>
        ))}
      </ul>
    )}
  </Card>
)

const Row = ({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) => (
  <div className={cn('flex justify-between gap-3 text-sm', strong && 'border-t border-line pt-2 font-semibold text-ink', muted && 'text-muted')}><span>{label}</span><span>{value}</span></div>
)

// /production/:id — one batch: pieces made, materials used, making costs, cost per piece. Cancel only.
export function ProductionViewPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const q = useApiQuery(['production', id], () => productionApi.get(id))
  const [cancelling, setCancelling] = useState(false)
  const p = q.data ?? q.lastData

  if (q.error && !p) return <Card><EmptyState title="Couldn't load" description={q.error} action={<Button onClick={() => navigate('/products')}>Back</Button>} /></Card>
  if (!p) return <div className="flex justify-center py-16"><Spinner /></div>
  const pieces = Number(p.pieces), stock = Number(p.stockCost), salaried = Number(p.salariedCost)

  return (
    <>
      <PageHeader
        title={p.docNo}
        subtitle={`${formatDate(p.docDate)}${p.title ? ` · ${p.title}` : ''} · by ${p.createdBy}`}
        actions={
          <>
            {p.status === 'POSTED' && <Button icon={IconBarcode} onClick={() => navigate(`/labels?production=${p.id}`)}>Labels</Button>}
            {p.status === 'POSTED' && <Button variant="danger" icon={IconX} onClick={() => setCancelling(true)}>Cancel</Button>}
          </>
        }
      />
      {p.status === 'CANCELLED' && <p className="mb-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">Cancelled{p.cancelledBy ? ` by ${p.cancelledBy}` : ''} — {p.cancelReason}. Stock was put back.</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Lines title={`Finished pieces (${pieces})`} lines={p.outputs} out />
          <Lines title="Materials used" lines={p.materials} />
          <Card title="Making costs" bodyClassName="p-0">
            {p.costs.length === 0 ? <p className="px-4 py-4 text-sm text-muted">None</p> : (
              <ul className="divide-y divide-line">
                {p.costs.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{c.description}</span>
                      <span className="block text-xs text-muted">
                        {c.kind === 'TAILOR' && c.tailor ? <><Link to={`/tailors/${c.tailor.id}`} className="text-brand hover:underline">{c.tailor.name}</Link> · {Number(c.qty)} × {formatINR(Number(c.rate))}</> : c.kind === 'PAID' && c.mode ? `${paymentModeLabels[c.mode]}${c.reference ? ` · ${c.reference}` : ''}` : 'Salaried — costing only'}
                      </span>
                    </span>
                    <Badge tone={c.kind === 'SALARIED' ? 'neutral' : 'info'}>{costKindLabels[c.kind].label}</Badge>
                    <span className="w-24 text-right text-sm font-medium text-ink">{formatINR(Number(c.amount))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {p.notes && <Card title="Notes"><p className="whitespace-pre-line text-sm text-ink-soft">{p.notes}</p></Card>}
        </div>
        <Card title="Cost">
          <div className="flex flex-col gap-1.5">
            <Row label="Materials from stock" value={formatINR(Number(p.materialCost))} />
            <Row label="Tailor (per piece)" value={formatINR(Number(p.labourCost))} />
            <Row label="Paid out" value={formatINR(Number(p.paidCost))} />
            <Row label="Stock cost" value={formatINR(stock)} strong />
            <Row label="Cost per piece" value={formatINR(stock / pieces)} strong />
            {salaried > 0 && <><Row label="+ Salaried staff (info)" value={formatINR(salaried)} muted /><Row label="Full cost per piece" value={formatINR((stock + salaried) / pieces)} muted /></>}
          </div>
        </Card>
      </div>
      {cancelling && (
        <CancelDocModal
          docNo={p.docNo}
          effect="Finished pieces leave stock, materials come back, the tailor's earning and the paid-out costs are reversed. Not possible if the pieces are already sold."
          onCancel={(r) => productionApi.cancel(p.id, r)}
          onClose={() => setCancelling(false)}
          onDone={() => { setCancelling(false); q.reload() }}
        />
      )}
    </>
  )
}
