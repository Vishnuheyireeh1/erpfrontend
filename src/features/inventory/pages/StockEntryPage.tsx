import { IconArrowLeft, IconFileSpreadsheet } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Feedback'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'
import { inventoryApi } from '../api/inventory.api'
import { EntryLineRow, entryGridClass, type EntryLine } from '../components/EntryLineRow'
import { ItemPicker } from '../components/ItemPicker'
import { adjustmentReasonOptions, todayISO } from '../constants'
import type { StockItem } from '../types'

let seq = 0

function lineError(l: EntryLine) {
  const q = Number(l.qty)
  if (!l.qty || !Number.isFinite(q) || q <= 0) return 'Enter a quantity above 0'
  if (!l.item.product.unit.allowDecimal && !Number.isInteger(q)) return `Whole ${l.item.product.unit.code} only`
  if (l.direction === 'in' && (l.unitCost === '' || Number(l.unitCost) < 0)) return 'Enter the cost per unit'
  return undefined
}

// /stock/new?kind=opening | adjustment — one screen for both stock documents.
export function StockEntryPage() {
  const [params] = useSearchParams()
  const isOpening = params.get('kind') === 'opening'
  const navigate = useNavigate()
  const toast = useToast()
  const [docDate, setDocDate] = useState(todayISO)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<EntryLine[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Scanning the same item again adds 1 (like a shop counter).
  const addItem = (item: StockItem) =>
    setLines((ls) => {
      const existing = ls.find((l) => l.item.id === item.id)
      if (existing) return ls.map((l) => (l === existing ? { ...l, qty: String((Number(l.qty) || 0) + 1) } : l))
      const cost = isOpening || Number(item.avgCost) <= 0 ? item.purchasePrice : item.avgCost
      return [...ls, { key: `l${++seq}`, item, direction: 'in', qty: '1', unitCost: String(Math.round(Number(cost) * 100) / 100) }]
    })

  const change = (key: string, patch: Partial<EntryLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const total = lines.reduce((s, l) => {
    const q = Number(l.qty) || 0
    return s + (l.direction === 'in' ? q * (Number(l.unitCost) || 0) : -q * Number(l.item.avgCost))
  }, 0)

  const save = async () => {
    setShowErrors(true)
    setFormError('')
    if (lines.length === 0) return setFormError('Add at least one item')
    if (!isOpening && !reason) return setFormError('Choose a reason for the adjustment')
    if (lines.some(lineError)) return setFormError('Fix the highlighted lines')
    setSaving(true)
    const body = {
      docDate,
      note: note.trim() || undefined,
      lines: lines.map((l) => ({
        variantId: l.item.id,
        qty: l.direction === 'in' ? Number(l.qty) : -Number(l.qty),
        unitCost: l.direction === 'in' ? Number(l.unitCost) : undefined,
      })),
    }
    try {
      const doc = isOpening ? await inventoryApi.createOpening(body) : await inventoryApi.createAdjustment({ ...body, reason })
      toast.success(`${doc.docNo} saved — stock updated`)
      navigate(`/stock/documents/${doc.id}`)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => navigate('/stock')} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> Stock
      </button>
      <PageHeader
        title={isOpening ? 'Opening stock' : 'Stock adjustment'}
        subtitle={isOpening ? 'Stock you already have on the go-live date.' : 'Correct stock for damage, loss, extra found or a recount.'}
        actions={isOpening && <Button icon={IconFileSpreadsheet} onClick={() => navigate('/stock/opening/import')}>Import from Excel</Button>}
      />

      <Card className="mb-5">
        <div className={cn('grid grid-cols-1 gap-4', isOpening ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
          <Input label="Date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} required />
          {!isOpening && (
            <Select label="Reason" required placeholder="Choose reason" options={adjustmentReasonOptions} value={reason} onChange={(e) => setReason(e.target.value)} />
          )}
          <Textarea label="Note" rows={1} placeholder={isOpening ? 'Physical count on go-live' : 'What happened'} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Card>

      <Card title={`Items (${lines.length})`} bodyClassName="p-0" className="mb-5">
        <div className="border-b border-line p-4">
          <ItemPicker onPick={addItem} />
        </div>
        {lines.length === 0 ? (
          <EmptyState title="Scan or search to add items" description="Scanning the same item again adds 1 to its quantity." />
        ) : (
          <>
            <div className={cn(entryGridClass, 'hidden px-4 py-2 text-xs font-medium text-muted lg:grid')}>
              <span>Item</span><span>Add / remove</span><span>Qty</span><span>Cost / unit</span><span className="text-right">Value</span><span />
            </div>
            {lines.map((l) => (
              <EntryLineRow
                key={l.key}
                line={l}
                allowDirection={!isOpening}
                error={showErrors ? lineError(l) : undefined}
                onChange={(p) => change(l.key, p)}
                onRemove={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
              />
            ))}
            <div className="flex items-center justify-between border-t border-line bg-page px-4 py-3">
              <span className="text-sm text-muted">Stock value change</span>
              <span className={cn('text-base font-semibold', total < 0 ? 'text-warn' : 'text-ink')}>{total < 0 ? '−' : '+'}{formatINR(Math.abs(total))}</span>
            </div>
          </>
        )}
      </Card>

      {formError && <p role="alert" className="mb-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{formError}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={() => navigate('/stock')}>Cancel</Button>
        <Button variant="primary" loading={saving} onClick={save}>{isOpening ? 'Save opening stock' : 'Save adjustment'}</Button>
      </div>
    </>
  )
}
