import { IconKeyboard, IconList, IconPrinter } from '@tabler/icons-react'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { todayISO } from '@/features/inventory/constants'
import { JobCostsEditor } from '@/features/jobs/components/JobCostsEditor'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { BillCustomerBar } from '../components/BillCustomerBar'
import { BillItemsCard } from '../components/BillItemsCard'
import { BillPaymentPanel } from '../components/BillPaymentPanel'
import { BillStitchingCard } from '../components/BillStitchingCard'
import { JobBillTotals } from '../components/JobBillTotals'
import { SaleTotals } from '../components/SaleTotals'
import { EditingBanner } from '../components/EditingBanner'
import { StepCard } from '../components/StepCard'
import { getBillingMode, setBillingMode } from '../fast/billingMode'
import { lineError, useBilling } from '../hooks/useBilling'

// /billing — the counter, ONE page for every bill (step by step; phones and tablets).
//   Shop bill     → items only (SDB/…); a named customer may pay part (credit), a walk-in pays in full.
//   Stitching job → choosing a garment in "Anything to stitch?" turns the same bill into a job bill (JOB/…).
// On a computer, "Fast bill" switches to the keyboard table screen (same rules, see fast/FastBillPage).
export function BillingPage() {
  const navigate = useNavigate()
  const b = useBilling()
  const wide = useMediaQuery('(min-width: 1024px)') // laptop: two columns; phone / tablet: one column in step order
  // This computer chose Fast bill last time → open it (keeping ?customer= etc.).
  const { search } = useLocation()
  useEffect(() => { if (wide && getBillingMode() === 'fast') navigate(`/billing/fast${search}`, { replace: true }) }, [wide, search, navigate])

  const customerStep = (
    <StepCard step={1} title="Customer">
      <BillCustomerBar customer={b.customer} onCustomer={b.setCustomer} meta={b.meta} onMeta={b.setMeta} needsCustomer={b.isJob} showErrors={b.showErrors} />
    </StepCard>
  )
  const itemsCard = (
    <BillItemsCard
      step={2}
      stitching={b.isJob}
      lines={b.lines}
      calc={b.lineCalc}
      errorOf={(l) => (b.showErrors ? lineError(l) : undefined)}
      onAdd={b.addItem}
      onChange={b.changeLine}
      onRemove={b.removeLine}
    />
  )
  const stitchStep = (
    <>
      <BillStitchingCard step={3} drafts={b.stitch} onChange={(d) => { b.setStitch(d); b.setError('') }} customerId={b.customer?.id} deliveryDate={b.deliveryDate} minDate={b.meta.docDate} onDelivery={b.setDeliveryDate} showErrors={b.showErrors} />
      {b.isJob && <Card title="Additional charges (optional)"><JobCostsEditor rows={b.charges} onChange={b.setCharges} /></Card>}
    </>
  )
  const paymentStep = (
    <StepCard step={4} title="Payment">
      <BillPaymentPanel
        customer={b.customer}
        meta={b.meta}
        onMeta={b.setMeta}
        tenders={b.tenders}
        onTenders={b.setTenders}
        grandTotal={b.payable}
        jobItemsTotal={b.isJob ? b.jobT.items.grandTotal : null}
        maxDate={todayISO()}
        advanceAvailable={b.advanceAvailable}
        useAdvance={b.useAdvance}
        onUseAdvance={b.setUseAdvance}
      />
    </StepCard>
  )
  const totalsCard = (
    <Card>
      {b.isJob ? (
        <JobBillTotals items={b.jobT.items.grandTotal} stitching={b.jobT.job.stitchCharges} discount={b.jobT.job.discount} gst={b.jobT.job.gst} gstRate={b.jobGstRate} roundOff={b.jobT.job.roundOff} total={b.jobT.job.grandTotal} />
      ) : (
        <SaleTotals totals={b.totals} taxMode={b.taxMode} gstRegistered={b.gstRegistered} />
      )}
      {b.customer && b.taxMode === 'INTER' && <div className="mt-2"><Badge tone="info">Other state — IGST</Badge></div>}
      {b.error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{b.error}</p>}
      <div className="mt-4 flex flex-col gap-3">
        <Switch label="Print after saving" checked={b.autoPrint} onChange={b.toggleAutoPrint} />
        <Button variant="primary" icon={IconPrinter} loading={b.saving} onClick={b.save} className="h-12 w-full text-base">
          {b.isJob ? 'Book stitching job' : b.editing ? 'Save changes' : 'Save bill'}{b.grandTotal > 0 ? ` · ₹${b.grandTotal.toLocaleString('en-IN')}` : ''}
        </Button>
        {(b.lines.length > 0 || b.stitch.length > 0 || b.customer) && <Button onClick={b.clearAll}>Clear</Button>}
      </div>
    </Card>
  )

  return (
    <>
      <PageHeader
        title={b.editing ? `Edit ${b.editing.docNo}` : 'New bill'}
        actions={
          <>
            {wide && <Button icon={IconKeyboard} onClick={() => { setBillingMode('fast'); navigate('/billing/fast') }}>Fast bill (keyboard)</Button>}
            <Button icon={IconList} onClick={() => navigate(b.isJob ? '/jobs' : '/sales')}>{b.isJob ? 'All jobs' : 'All bills'}</Button>
          </>
        }
      />
      <EditingBanner b={b} />
      {/* 1 Customer | 2 What are they buying, then 3 Anything to stitch | 4 Payment (stacked on phone). */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {customerStep}
          {wide && stitchStep}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          {itemsCard}
          {!wide && stitchStep}
          {paymentStep}
          {totalsCard}
        </div>
      </div>
    </>
  )
}
