import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'
import { paymentModeOptions } from '../api/purchase.api'
import type { ExtrasForm } from '../billExtras'


type Props = { value: ExtrasForm; onChange: (patch: Partial<ExtrasForm>) => void }

// The bottom of a supplier bill: cash discount, packing / forwarding (+ its GST), and freight paid to the transporter.
export function BillExtrasFields({ value: v, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Cash / bill discount</span>
          <div className="inline-flex rounded-control border border-line p-0.5 text-xs" role="group" aria-label="Discount in">
            {(['%', '₹'] as const).map((m) => (
              <button key={m} type="button" onClick={() => onChange({ discountMode: m })} className={cn('rounded-[6px] px-2.5 py-0.5', v.discountMode === m ? 'bg-brand text-white' : 'text-ink-soft')}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <Input aria-label="Cash discount" type="number" inputMode="decimal" min={0} value={v.discount} onChange={(e) => onChange({ discount: e.target.value })} placeholder={v.discountMode === '%' ? '2' : '344.35'} hint="Before GST, on the whole bill" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
        <Input label="Packing / other charges ₹" type="number" inputMode="decimal" min={0} value={v.other} onChange={(e) => onChange({ other: e.target.value })} hint="On the supplier's bill" />
        <Select label="GST" value={v.chargesGst} onChange={(e) => onChange({ chargesGst: e.target.value })} options={['0', '5', '12', '18'].map((r) => ({ value: r, label: `${r}%` }))} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_130px] gap-2">
        <Input label="Freight (lorry) ₹" type="number" inputMode="decimal" min={0} value={v.freight} onChange={(e) => onChange({ freight: e.target.value })} hint="Paid to the transporter, not this supplier — added to the item cost" />
        {Number(v.freight) > 0 && <Select label="Paid by" value={v.freightMode} onChange={(e) => onChange({ freightMode: e.target.value })} options={[...paymentModeOptions, { value: '', label: 'Not paid yet' }]} />}
      </div>
      <Input label="Transport / note" value={v.freightNote} onChange={(e) => onChange({ freightNote: e.target.value })} placeholder="2 bales, APS transport" />
    </div>
  )
}
