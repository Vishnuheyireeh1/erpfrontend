import { IconFileTypePdf } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { fetchFile } from '@/features/sales/print/printing'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { monthLabel, payrollApi } from '../api/staff.api'
import type { PayrollRow } from '../types'
import { PayslipModal } from './PayslipModal'

type Props = { version: number; onAdvance: (staffId: number, month: string) => void }

// Staff & salary → "Monthly salary": everyone's pay for a month — salary − advance taken + per-piece work —
// Pay (makes a payslip), print the payslip, or give an advance.
export function PayrollSheet({ version, onAdvance }: Props) {
  const toast = useToast()
  const [month, setMonth] = useState(() => todayISO().slice(0, 7))
  const [paying, setPaying] = useState<PayrollRow | null>(null)
  const [cancelling, setCancelling] = useState<PayrollRow | null>(null)
  const q = useApiQuery(['payroll', month, version], () => payrollApi.sheet(month))
  const pdf = (id: number) => fetchFile(payrollApi.pdfPath(id)).catch((e) => toast.error(e instanceof Error ? e.message : 'Could not download'))
  const t = q.data?.totals

  const columns: Column<PayrollRow>[] = [
    {
      key: 'name',
      header: 'Staff',
      mobile: 'title',
      render: (r) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-ink">{r.staff.name}</span>
          <span className="block text-xs text-muted">{r.staff.code} · {r.staff.role}</span>
        </span>
      ),
    },
    { key: 'salary', header: 'Salary', align: 'right', render: (r) => (r.salary > 0 ? formatINR(r.salary) : <span className="text-muted">—</span>) },
    { key: 'advance', header: 'Advance taken', align: 'right', render: (r) => (r.advance > 0 ? <span className="text-danger">− {formatINR(r.advance)}</span> : <span className="text-muted">—</span>) },
    {
      key: 'piece',
      header: 'Per-piece work',
      align: 'right',
      render: (r) => !r.isPiece ? <span className="text-muted">—</span> : (
        <span className="block">
          <span className="block">{formatINR(r.pieceDue)}</span>
          <span className="block text-xs text-muted">{formatINR(r.pieceEarned)} this month{r.piecePieces ? ` · ${r.piecePieces} pcs` : ''}</span>
        </span>
      ),
    },
    {
      key: 'pay',
      header: 'To pay',
      align: 'right',
      mobile: 'subtitle',
      render: (r) => (r.payslip ? <span className="font-medium text-success">Paid {formatINR(Number(r.payslip.netPaid))}</span> : <span className="font-semibold text-ink">{formatINR(r.toPay)}</span>),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <span className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {r.payslip ? (
            <>
              <Button size="sm" icon={IconFileTypePdf} onClick={() => pdf(r.payslip!.id)}>Payslip</Button>
              <button type="button" onClick={() => setCancelling(r)} className="text-xs text-muted hover:text-danger">Cancel</button>
            </>
          ) : r.staff.isActive ? (
            <>
              <Button size="sm" onClick={() => onAdvance(r.staff.id, month)}>Advance</Button>
              <Button size="sm" variant="primary" onClick={() => setPaying(r)}>Pay</Button>
            </>
          ) : null}
        </span>
      ),
    },
  ]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input label="Month" type="month" max={todayISO().slice(0, 7)} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-48" />
        <ExportButton path="/payroll/export" params={{ month }} />
        {t && (
          <p className="text-sm text-muted sm:ml-auto">
            {monthLabel(month)}: <b className="text-ink">{t.done} of {t.people}</b> paid · paid {formatINR(t.paid)} · still to pay <b className="text-ink">{formatINR(t.toPay)}</b>
          </p>
        )}
      </div>
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load salaries" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <DataTable
            numbered
            columns={columns}
            rows={q.data?.rows ?? []}
            rowKey={(r) => r.staff.id}
            loading={q.loading}
            emptyTitle="No staff for this month"
            emptyDescription="Add staff first (Staff tab → Add staff)."
          />
        )}
      </Card>
      {paying && <PayslipModal row={paying} month={month} onClose={() => setPaying(null)} onPaid={() => { setPaying(null); q.reload() }} />}
      {cancelling?.payslip && (
        <CancelDocModal
          docNo={cancelling.payslip.docNo}
          effect="The salary and per-piece payments on it are cancelled too — the money goes back to cash / bank."
          onCancel={(r) => payrollApi.cancel(cancelling.payslip!.id, r)}
          onClose={() => setCancelling(null)}
          onDone={() => { setCancelling(null); q.reload() }}
        />
      )}
    </>
  )
}
