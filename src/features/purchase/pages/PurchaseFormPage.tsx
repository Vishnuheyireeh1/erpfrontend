import { IconArrowLeft, IconPlus } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Feedback'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ItemPicker } from '@/features/inventory/components/ItemPicker'
import { todayISO } from '@/features/inventory/constants'
import type { StockItem } from '@/features/inventory/types'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { gstStates, taxModeFor } from '@/lib/gst'
import { useApiQuery } from '@/lib/useApiQuery'
import { paymentModeOptions, purchaseApi, supplierApi } from '../api/purchase.api'
import { BillLineRow, billGridClass, type BillLine } from '../components/BillLineRow'
import { emptyExtras, extrasInput, type ExtrasForm } from '../billExtras'
import { BillExtrasFields } from '../components/BillExtrasFields'
import { BillTotals } from '../components/BillTotals'
import { QuickProductModal } from '../components/QuickProductModal'
import { SupplierFormModal } from '../components/SupplierFormModal'
import { calcBill } from '../calc'
import type { PaymentMode } from '../types'

let seq = 0
const lineError = (l: BillLine) => {
  const q = Number(l.qty)
  if (!(q > 0)) return 'Enter a quantity above 0'
  if (!l.item.product.unit.allowDecimal && !Number.isInteger(q)) return `Whole ${l.item.product.unit.code} only`
  if (l.rate === '' || Number(l.rate) < 0) return 'Enter the rate'
  return undefined
}

// /purchase/new — enter a supplier's bill: stock goes up, GST worked out, optionally paid now.
export function PurchaseFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const { profile } = useBusinessProfile()
  const suppliers = useApiQuery('active-suppliers', () => supplierApi.list({ status: 'active', pageSize: 100 }))

  const [supplierId, setSupplierId] = useState(params.get('supplier') ?? '')
  const [billNo, setBillNo] = useState('')
  const [billDate, setBillDate] = useState(todayISO)
  const [docDate, setDocDate] = useState(todayISO)
  const [extras, setExtras] = useState<ExtrasForm>(emptyExtras)
  const [quickAdd, setQuickAdd] = useState(false)
  const [newSupplier, setNewSupplier] = useState(false)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<BillLine[]>([])
  const [payNow, setPayNow] = useState(false)
  const [pay, setPay] = useState({ amount: '', mode: 'CASH' as PaymentMode, reference: '' })
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const supplier = suppliers.data?.items.find((s) => String(s.id) === supplierId)
  const taxMode = taxModeFor(profile?.stateCode ?? '32', supplier?.stateCode) as 'INTRA' | 'INTER'
  const totals = useMemo(
    () => calcBill(lines.map((l) => ({ qty: Number(l.qty) || 0, rate: Number(l.rate) || 0, discountPct: Number(l.discountPct) || 0, gstRate: Number(l.gstRate) || 0 })), extrasInput(extras), taxMode),
    [lines, extras, taxMode],
  )

  // Scanning the same item again adds 1 to its quantity.
  const addItem = (item: StockItem, qty = '1') =>
    setLines((ls) => {
      const existing = ls.find((l) => l.item.id === item.id)
      if (existing) return ls.map((l) => (l === existing ? { ...l, qty: String((Number(l.qty) || 0) + (Number(qty) || 1)) } : l))
      return [...ls, { key: `b${++seq}`, item, qty, rate: String(Number(item.purchasePrice)), discountPct: '0', gstRate: String(Number(item.product.taxRate?.rate ?? 0)) }]
    })
  const change = (key: string, patch: Partial<BillLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const save = async () => {
    setShowErrors(true)
    setError('')
    if (!supplierId) return setError('Choose the supplier')
    if (!billNo.trim()) return setError("Enter the supplier's bill number")
    if (lines.length === 0) return setError('Add at least one item')
    if (lines.some(lineError)) return setError('Fix the highlighted items')
    const paid = payNow ? Number(pay.amount || totals.grand) : 0
    if (payNow && !(paid > 0)) return setError('Enter the amount paid now')
    setSaving(true)
    try {
      const bill = await purchaseApi.create({
        supplierId: Number(supplierId), supplierInvoiceNo: billNo.trim(), supplierInvoiceDate: billDate, docDate,
        ...extrasInput(extras), freightNote: extras.freightNote.trim() || undefined, notes: notes.trim() || undefined,
        lines: lines.map((l) => ({ variantId: l.item.id, qty: Number(l.qty), rate: Number(l.rate), discountPct: Number(l.discountPct) || 0, gstRate: Number(l.gstRate) || 0 })),
        payNow: payNow ? { amount: paid, mode: pay.mode, reference: pay.reference || undefined } : null,
      })
      toast.success(`${bill.docNo} saved — stock updated`)
      navigate(`/purchase/${bill.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => navigate('/purchase')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Purchase
      </button>
      <PageHeader title="New purchase bill" subtitle="Enter the supplier's bill. Stock goes up when you save." />

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-2 sm:col-span-2">
            <Select
              label="Supplier"
              required
              placeholder={suppliers.loading ? 'Loading…' : 'Choose supplier'}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={(suppliers.data?.items ?? []).map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` }))}
              className="min-w-0 flex-1"
              hint={supplier ? `${gstStates[supplier.stateCode]} · ${supplier.gstin ?? 'no GSTIN'}` : 'New supplier? Tap "+ New" — no need to leave this bill'}
            />
            <Button icon={IconPlus} onClick={() => setNewSupplier(true)} className="mt-[1.6rem] h-11 shrink-0">New</Button>
          </div>
          <Input label="Supplier's bill no." required value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="KT/889" />
          <Input label="Bill date" type="date" max={todayISO()} value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          <Input label="Received on" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
          <div className="flex items-end pb-2 sm:col-span-3">
            <Badge tone="info">{taxMode === 'INTRA' ? 'Same state — CGST + SGST' : 'Other state — IGST'}</Badge>
          </div>
        </div>
      </Card>

      <Card title={`Items (${lines.length})`} bodyClassName="p-0" className="mb-5">
        <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row">
          <div className="min-w-0 flex-1"><ItemPicker onPick={(i) => addItem(i)} placeholder="Scan barcode or search the item received" /></div>
          <Button icon={IconPlus} onClick={() => setQuickAdd(true)} className="h-11 shrink-0">New item</Button>
        </div>
        {lines.length === 0 ? (
          <EmptyState title="Scan or search to add items" description='A design you never bought before? Tap "New item" above — it is added to Products and to this bill.' />
        ) : (
          <>
            <div className={cn(billGridClass, 'hidden px-4 py-2 text-xs font-medium text-muted lg:grid')}>
              <span>Item</span><span>Qty</span><span>Rate ₹</span><span>Disc %</span><span>GST %</span><span className="text-right">Amount</span><span />
            </div>
            {lines.map((l, i) => (
              <BillLineRow key={l.key} line={l} total={totals.rows[i]?.total ?? 0} error={showErrors ? lineError(l) : undefined} onChange={(p) => change(l.key, p)} onRemove={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />
            ))}
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex flex-col gap-4">
            <BillExtrasFields value={extras} onChange={(patch) => setExtras((x) => ({ ...x, ...patch }))} />
            <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Switch label="Paying the supplier now?" hint={payNow ? "Full amount, or type less for a part payment — the rest stays due" : "Off = pay later (use Pay supplier on the bill)"} checked={payNow} onChange={setPayNow} />
            {payNow && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input label="Amount ₹" type="number" inputMode="decimal" min={0} value={pay.amount} placeholder={String(totals.grand)} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} />
                <Select label="Paid by" value={pay.mode} onChange={(e) => setPay((p) => ({ ...p, mode: e.target.value as PaymentMode }))} options={paymentModeOptions} />
                <Input label="Reference" value={pay.reference} onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} />
              </div>
            )}
          </div>
        </Card>
        <Card title="Bill total">
          <BillTotals totals={totals} taxMode={taxMode} />
        </Card>
      </div>

      {error && <p role="alert" className="mt-5 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={() => navigate('/purchase')}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={save}>Save purchase bill</Button>
      </div>
      {quickAdd && <QuickProductModal onClose={() => setQuickAdd(false)} onCreated={(lines) => { setQuickAdd(false); lines.forEach((l) => addItem(l.item, l.qty)) }} />}
      {newSupplier && (
        <SupplierFormModal supplier={null} onClose={() => setNewSupplier(false)} onSaved={(sp) => { setNewSupplier(false); suppliers.reload(); setSupplierId(String(sp.id)) }} />
      )}
    </>
  )
}
