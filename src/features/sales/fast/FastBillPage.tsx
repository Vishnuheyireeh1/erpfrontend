import { IconLayoutList, IconList, IconPrinter } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { todayISO } from '@/features/inventory/constants'
import { JobCostsEditor } from '@/features/jobs/components/JobCostsEditor'
import type { StockItem } from '@/features/inventory/types'
import { calcSaleDue } from './fastDue'
import { BillCustomerBar } from '../components/BillCustomerBar'
import { EditingBanner } from '../components/EditingBanner'
import { BillPaymentPanel } from '../components/BillPaymentPanel'
import { JobBillTotals } from '../components/JobBillTotals'
import { SaleTotals } from '../components/SaleTotals'
import { useBilling } from '../hooks/useBilling'
import { setBillingMode } from './billingMode'
import { FastItemGrid } from './FastItemGrid'
import { FastStitchGrid } from './FastStitchGrid'
import { ItemSearchModal } from './ItemSearchModal'

const KEYS: [string, string][] = [['Enter', 'Next box'], ['F2', 'Find item'], ['F4', 'Customer'], ['F6', 'Measurements'], ['F8', 'Payment'], ['F9 / Ctrl+S', 'Save'], ['Esc', 'Close']]

// /billing/fast — the counter screen for the computer, laid out like EQUAL: header, item table, totals and payment,
// worked from the keyboard. Same bill rules as the step-by-step page (useBilling). Cash = paid in full;
// Credit = a named customer (name + phone) may pay part now — the rest is their balance.
export function FastBillPage() {
  const navigate = useNavigate()
  const b = useBilling()
  const entryRef = useRef<HTMLInputElement>(null)
  const customerRef = useRef<HTMLDivElement>(null)
  const payRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [measureFor, setMeasureFor] = useState<string | null>(null)
  const [mode, setMode] = useState<'CASH' | 'CREDIT'>('CASH')
  const due = calcSaleDue(b)

  useEffect(() => { entryRef.current?.focus() }, [])
  const pick = (item: StockItem) => { b.addItem(item); setPendingId(item.id); setSearch(null) }
  const focusIn = (box: HTMLDivElement | null) => box?.querySelector<HTMLInputElement>('input:not([type=checkbox]):not([disabled])')?.focus()
  // F8: to the amount box; on a Cash shop bill an empty amount is filled with what is still due (paid in full).
  const toPayment = useCallback(() => {
    if (mode === 'CASH' && !b.isJob && due > 0.004 && !(Number(b.tenders[0]?.amount) > 0)) b.setTenders(b.tenders.map((t, i) => (i === 0 ? { ...t, amount: String(due) } : t)))
    window.setTimeout(() => { const el = payRef.current?.querySelector<HTMLInputElement>('input[aria-label="Payment 1 amount"]'); el?.focus(); el?.select() }, 0)
  }, [b, due, mode])

  const save = useCallback(() => {
    if (!b.isJob && due > 0.004) {
      const named = b.customer || b.meta.walkInPhone.trim()
      if (mode === 'CASH') return b.setError(`Cash bill: ₹${due.toLocaleString('en-IN')} still to take (F8), or choose Credit`)
      if (!named) return b.setError("Credit needs the customer's name and phone (F4)")
    }
    void b.save()
  }, [b, due, mode])

  // Shortcut keys anywhere on the page (popups handle their own keys).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (search !== null || measureFor) return
      const k = e.key
      if (k === 'F2') { e.preventDefault(); setSearch('') }
      else if (k === 'F4') { e.preventDefault(); focusIn(customerRef.current) }
      else if (k === 'F6') { e.preventDefault(); if (b.stitch.length) setMeasureFor(b.stitch[b.stitch.length - 1].key) }
      else if (k === 'F8') { e.preventDefault(); toPayment() }
      else if (k === 'F9' || ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 's')) { e.preventDefault(); save() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [search, measureFor, b.stitch, save, toPayment])

  return (
    <>
      <PageHeader
        title={b.editing ? `Edit ${b.editing.docNo}` : 'Fast bill'}
        subtitle="Keyboard billing — Enter moves to the next box."
        actions={
          <>
            <Button icon={IconLayoutList} onClick={() => { setBillingMode('steps'); navigate('/billing') }}>Step-by-step screen</Button>
            <Button icon={IconList} onClick={() => navigate(b.isJob ? '/jobs' : '/sales')}>{b.isJob ? 'All jobs' : 'All bills'}</Button>
          </>
        }
      />

      <EditingBanner b={b} />
      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div><p className="mb-1.5 text-sm font-medium text-ink">Bill type</p><div className="flex h-11 items-center">{b.isJob ? <Badge tone="brand">Job bill (stitching)</Badge> : <Badge tone="info">Shop bill</Badge>}</div></div>
            <Select label="Cash / Credit" value={mode} onChange={(e) => setMode(e.target.value as 'CASH' | 'CREDIT')} options={[{ value: 'CASH', label: 'Cash — paid in full' }, { value: 'CREDIT', label: 'Credit — pay later' }]} disabled={b.isJob} />
            {b.isJob && <Input label="Ready by" type="date" min={b.meta.docDate} value={b.deliveryDate} onChange={(e) => b.setDeliveryDate(e.target.value)} />}
          </div>
          <div ref={customerRef}>
            <BillCustomerBar customer={b.customer} onCustomer={b.setCustomer} meta={b.meta} onMeta={b.setMeta} needsCustomer={b.isJob || mode === 'CREDIT'} showErrors={b.showErrors} />
          </div>
        </div>
      </Card>

      <Card title={`Items (${b.lines.length})`} bodyClassName="p-0" className="mb-4">
        <FastItemGrid b={b} entryRef={entryRef} onSearch={setSearch} onPick={pick} pendingId={pendingId} onFocused={() => setPendingId(null)} />
      </Card>

      <Card title={`Stitching${b.stitch.length ? ` (${b.stitch.length})` : ' — optional'}`} bodyClassName="p-0" className="mb-4">
        <FastStitchGrid b={b} measureFor={measureFor} onMeasure={setMeasureFor} />
        {b.isJob && <div className="border-t border-line p-4"><p className="mb-2 text-sm font-medium text-ink">Additional charges (optional)</p><JobCostsEditor rows={b.charges} onChange={b.setCharges} /></div>}
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          {b.isJob ? (
            <JobBillTotals items={b.jobT.items.grandTotal} stitching={b.jobT.job.stitchCharges} discount={b.jobT.job.discount} gst={b.jobT.job.gst} gstRate={b.jobGstRate} roundOff={b.jobT.job.roundOff} total={b.jobT.job.grandTotal} />
          ) : (
            <SaleTotals totals={b.totals} taxMode={b.taxMode} gstRegistered={b.gstRegistered} />
          )}
          {b.error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{b.error}</p>}
          <div className="mt-4 flex flex-col gap-3">
            <Switch label="Print after saving" checked={b.autoPrint} onChange={b.toggleAutoPrint} />
            <Button variant="primary" icon={IconPrinter} loading={b.saving} onClick={save} className="h-12 w-full text-base">
              {b.isJob ? 'Book stitching job' : b.editing ? 'Save changes' : 'Save bill'}{b.grandTotal > 0 ? ` · ₹${b.grandTotal.toLocaleString('en-IN')}` : ''} (F9)
            </Button>
            {(b.lines.length > 0 || b.stitch.length > 0 || b.customer) && <Button onClick={() => { b.clearAll(); entryRef.current?.focus() }}>Clear bill</Button>}
          </div>
        </Card>
        <Card title="Payment (F8)">
          <div ref={payRef}>
            <BillPaymentPanel customer={b.customer} meta={b.meta} onMeta={b.setMeta} tenders={b.tenders} onTenders={b.setTenders} grandTotal={b.payable}
              jobItemsTotal={b.isJob ? b.jobT.items.grandTotal : null} maxDate={todayISO()} advanceAvailable={b.advanceAvailable} useAdvance={b.useAdvance} onUseAdvance={b.setUseAdvance} />
          </div>
        </Card>
      </div>

      <div className="sticky bottom-0 z-20 hidden rounded-card border border-line bg-card/95 px-4 py-2 text-xs text-ink-soft shadow-sm backdrop-blur lg:block">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {KEYS.map(([k, label]) => <span key={k}><kbd className="rounded border border-line bg-page px-1.5 py-0.5 font-mono text-[11px] text-ink">{k}</kbd> {label}</span>)}
        </div>
      </div>

      {search !== null && <ItemSearchModal initial={search} onPick={pick} onClose={() => { setSearch(null); entryRef.current?.focus() }} />}
    </>
  )
}
