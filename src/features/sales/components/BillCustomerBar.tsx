import { Textarea } from '@/components/ui/Input'
import type { Customer } from '../types'
import type { BillMeta } from './BillPaymentPanel'
import { CustomerQuickField } from './CustomerQuickField'

type Props = {
  customer: Customer | null
  onCustomer: (c: Customer | null) => void
  meta: BillMeta
  onMeta: (patch: Partial<BillMeta>) => void
  needsCustomer?: boolean // stitching on the bill → name AND phone needed (measurements, balance)
  showErrors?: boolean
}

// Billing → "1 Customer": everyone who buys is saved as a customer. Type the name (+ phone) — saved customers that
// match show below to tap. Shop bill: name alone is fine; both empty = a quick walk-in bill. Stitching: name + phone.
// The typed name / phone live in meta.walkInName / walkInPhone until the bill is saved.
export function BillCustomerBar({ customer, onCustomer, meta, onMeta, needsCustomer, showErrors }: Props) {
  return (
    <div className="@container flex flex-col gap-3">
      <CustomerQuickField
        value={customer}
        onChange={onCustomer}
        name={meta.walkInName}
        phone={meta.walkInPhone}
        onName={(walkInName) => onMeta({ walkInName })}
        onPhone={(walkInPhone) => onMeta({ walkInPhone })}
        showErrors={showErrors}
        phoneRequired={!!needsCustomer}
      />
      {/* Optional — saved on the customer (new or picked) when the bill is saved. */}
      <Textarea label="Address (optional)" rows={1} maxLength={255} value={meta.address ?? customer?.address ?? ''} onChange={(e) => onMeta({ address: e.target.value })} placeholder="House name, street, place" />
    </div>
  )
}
