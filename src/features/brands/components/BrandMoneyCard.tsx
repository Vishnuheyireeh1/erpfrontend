import { IconCash } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { formatDate, formatINR } from '@/lib/format'
import { brandMoneyApi } from '../api/brandMoney.api'
import type { BrandOrder } from '../types'

type Props = { order: BrandOrder; onReceive: () => void; onChanged: () => void }
type Paid = BrandOrder['payments'][number]

// Brand order page, right side: what the order comes to, what the brand paid on it, and the balance.
export function BrandMoneyCard({ order, onReceive, onChanged }: Props) {
  const [cancelling, setCancelling] = useState<Paid | null>(null)
  const charged = order.materials.reduce((s, m) => s + Number(m.amount), 0)
  return (
    <Card title="Money" className="mb-5">
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between gap-3"><span className="text-ink-soft">Order value{charged > 0 ? ' (with items)' : ''}</span><span className="font-medium">{formatINR(order.total)}</span></div>
        {order.payments.map((p) => (
          <div key={p.id} className="flex justify-between gap-3 text-ink-soft">
            <span className="min-w-0">{formatDate(p.docDate)} · {p.mode.toLowerCase()}<button type="button" onClick={() => setCancelling(p)} className="ml-2 text-xs text-muted hover:text-danger">Cancel</button></span>
            <span className="shrink-0 text-success">− {formatINR(Number(p.amount))}</span>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-3 border-t border-line pt-2 text-base font-semibold"><span>Balance</span><span className={order.balance > 0.004 ? 'text-warn' : 'text-success'}>{formatINR(order.balance)}</span></div>
      </div>
      {order.status !== 'CANCELLED' && order.balance > 0.004 && <Button fullWidth icon={IconCash} onClick={onReceive} className="mt-3">Receive money</Button>}
      {cancelling && (
        <CancelDocModal
          docNo={cancelling.docNo}
          effect={`${formatINR(Number(cancelling.amount))} comes off this order and goes back on ${order.brandName}'s balance.`}
          onCancel={(reason) => brandMoneyApi.cancelPayment(cancelling.id, reason)}
          onClose={() => setCancelling(null)}
          onDone={() => { setCancelling(null); onChanged() }}
        />
      )}
    </Card>
  )
}
