import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatDate, formatINR } from '@/lib/format'
import type { CustomerRow } from '../moneyTypes'

const STAGE = { IN_WORK: 'In work', READY: 'Ready', DELIVERED: 'Delivered' } as const
const TONE = { IN_WORK: 'pending', READY: 'success', DELIVERED: 'neutral' } as const

// Brand reports → By customer → click a customer: their pieces. Click a piece to open its order.
export function BrandCustomerModal({ row, onClose }: { row: CustomerRow; onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <Modal open onClose={onClose} size="lg" title={row.customer} description={`${row.pieces} pieces · ${row.delivered} delivered · ${row.pending} pending · ${formatINR(row.amount)}`} footer={<Button onClick={onClose}>Close</Button>}>
      <ul className="divide-y divide-line rounded-card border border-line">
        {row.list.map((p) => (
          <li key={p.itemId}>
            <button type="button" onClick={() => navigate(`/brand-orders/${p.orderId}`)} className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left hover:bg-page">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{p.qty} × {p.piece}</span>
                <span className="block text-xs text-muted">{p.docNo} · {formatDate(p.docDate)} · {p.brand}</span>
              </span>
              <span className="flex items-center gap-3">
                <Badge tone={TONE[p.stage]}>{STAGE[p.stage]}</Badge>
                <span className="text-sm font-medium text-ink">{formatINR(p.amount)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
