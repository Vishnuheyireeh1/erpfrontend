import { IconArrowLeft, IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { newItem } from '@/features/jobs/jobDrafts'
import { garmentApi, tailorApi } from '@/features/workshop/api/workshop.api'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { brandApi } from '../api/brand.api'
import { brandOrderApi } from '../api/brandOrder.api'
import { BrandPieceEditor } from '../components/BrandPieceEditor'
import { fromOrder, newPiece, pieceAmount, pieceError, toOrderInput, type OrderForm, type PieceDraft } from '../orderDrafts'
import type { BrandOrder } from '../types'

const inDays = (n: number) => {
  const d = new Date(todayISO() + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// /brand-orders/new and /brand-orders/:id/edit — loads the order first when editing.
export function BrandOrderFormPage() {
  const id = Number(useParams().id) || 0
  const q = useApiQuery(['brand-order-edit', id], () => (id ? brandOrderApi.get(id) : Promise.resolve(null)))
  if (!id) return <OrderFormView order={null} />
  if (q.error) return <Card><EmptyState title="Couldn't open this order" description={q.error} /></Card>
  if (!q.data) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  if (q.data.status !== 'OPEN') return <Card><EmptyState title={`${q.data.docNo} can't be edited`} description="Delivered and cancelled orders are locked." /></Card>
  return <OrderFormView order={q.data} />
}

function OrderFormView({ order }: { order: BrandOrder | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const garments = useApiQuery('garments', () => garmentApi.list())
  const tailors = useApiQuery('tailor-options', () => tailorApi.options())
  const brands = useApiQuery('brand-options', () => brandApi.list({ status: 'active', pageSize: 100 }))
  const initial = order ? fromOrder(order) : null
  const [sp] = useSearchParams()
  const [brandId, setBrandId] = useState(sp.get('brand') ?? '')
  const [form, setForm] = useState<OrderForm>(() => initial?.form ?? { theirOrderNo: '', docDate: todayISO(), expectedDate: inDays(10), labelNote: '', notes: '' })
  const [pieces, setPieces] = useState<PieceDraft[]>(() => initial?.pieces ?? [newPiece()])
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const delivered = order ? order.items.filter((i) => i.stage === 'DELIVERED').length : 0

  const set = (p: Partial<OrderForm>) => { setForm((f) => ({ ...f, ...p })); setError('') }
  const setPiece = (key: string, p: Partial<PieceDraft>) => { setPieces((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x))); setError('') }
  // Same garment, rate, tailor and cloth — new person, fresh measurements.
  const copyPiece = (d: PieceDraft) => {
    const copy: PieceDraft = { ...d, ...newItem(), garmentTypeId: d.garmentTypeId, description: d.description, qty: d.qty, chargeRate: d.chargeRate, tailorId: d.tailorId, labourRate: d.labourRate, instructions: d.instructions, ownFabric: d.ownFabric, endCustomer: '', materials: [], id: undefined, stage: undefined }
    setPieces((xs) => { const at = xs.findIndex((x) => x.key === d.key); return [...xs.slice(0, at + 1), copy, ...xs.slice(at + 1)] })
  }
  const count = pieces.reduce((s, d) => s + (Number(d.qty) || 0), 0)
  const total = pieces.reduce((s, d) => s + pieceAmount(d), 0)

  const save = async () => {
    setShowErrors(true)
    if (!order && !brandId) return setError('Choose the brand')
    if (!form.expectedDate) return setError('Choose the due date')
    if (pieces.some((d) => pieceError(d))) return setError('Check the pieces marked in red')
    setSaving(true)
    try {
      const body = toOrderInput(form, pieces)
      const saved = order ? await brandOrderApi.update(order.id, body) : await brandOrderApi.create({ ...body, brandId: Number(brandId), docDate: form.docDate })
      toast.success(order ? 'Order updated' : `Order ${saved.docNo} saved`)
      navigate(`/brand-orders/${saved.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  if (garments.error || tailors.error) return <Card><EmptyState title="Couldn't load garments / tailors" description={garments.error ?? tailors.error ?? ''} /></Card>
  if (!garments.data || !tailors.data) return <div className="flex justify-center py-16"><Spinner size={28} /></div>

  return (
    <>
      <button type="button" onClick={() => navigate(order ? `/brand-orders/${order.id}` : '/brand-orders')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> {order ? order.docNo : 'Brand orders'}
      </button>
      <PageHeader title={order ? `Edit ${order.docNo}` : 'New brand order'} subtitle="Each piece with who it is for, measurements, rate, tailor and whose cloth." />
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {order ? (
              <div><p className="mb-1.5 text-sm font-medium text-ink">Brand</p><p className="flex h-11 items-center text-sm text-ink">{order.brandName}</p></div>
            ) : (
              <Select label="Brand" required placeholder={brands.loading ? 'Loading…' : 'Choose'} value={brandId} onChange={(e) => { setBrandId(e.target.value); setError('') }}
                options={(brands.data?.items ?? []).map((b) => ({ value: String(b.id), label: b.name }))}
                hint={!brands.loading && !brands.data?.items.length ? 'Add the brand first in Workshop → Brands' : undefined} />
            )}
            <Input label="Their order no." value={form.theirOrderNo} maxLength={40} onChange={(e) => set({ theirOrderNo: e.target.value })} placeholder="e.g. ZK-1123" />
            {!order && <Input label="Received on" type="date" max={todayISO()} value={form.docDate} onChange={(e) => set({ docDate: e.target.value })} />}
            <Input label="Due date" type="date" min={form.docDate} value={form.expectedDate} onChange={(e) => set({ expectedDate: e.target.value })} />
            <Input label="Label / emblem note" className="sm:col-span-2" maxLength={300} value={form.labelNote} onChange={(e) => set({ labelNote: e.target.value })} placeholder="e.g. their label at back neck — labels given by the brand" />
            <Textarea label="Notes" rows={1} className="sm:col-span-2" maxLength={1000} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Packing, delivery instructions…" />
          </div>
        </Card>

        <Card title={`Pieces (${count})`} actions={<span className="text-sm font-semibold text-ink">{formatINR(total)}</span>}>
          <div className="flex flex-col gap-5">
            {delivered > 0 && <p className="text-sm text-muted">{delivered} delivered piece line(s) are not shown — they can't change.</p>}
            {pieces.map((d, i) => (
              <BrandPieceEditor
                key={d.key}
                index={i}
                draft={d}
                garments={garments.data!}
                tailors={tailors.data!}
                error={showErrors ? pieceError(d) : undefined}
                onChange={(p) => setPiece(d.key, p)}
                onRemove={pieces.length > 1 ? () => setPieces((xs) => xs.filter((x) => x.key !== d.key)) : undefined}
                onCopy={() => copyPiece(d)}
              />
            ))}
            <Button icon={IconPlus} onClick={() => setPieces((xs) => [...xs, newPiece()])} className="w-fit">Add piece</Button>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">{count} piece{count === 1 ? '' : 's'} · order value <span className="font-semibold text-ink">{formatINR(total)}</span><span className="block text-xs text-muted">Billed to the brand as pieces are delivered (GST chosen on each bill).</span></p>
            <Button variant="primary" loading={saving} onClick={save} className="h-12 sm:w-64">{order ? 'Save changes' : 'Save order'}</Button>
          </div>
          {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
        </Card>
      </div>
    </>
  )
}
