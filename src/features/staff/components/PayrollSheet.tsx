import { IconFileTypePdf } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Column } from '@/components/ui/DataTable'
import { PagedTable } from '@/components/ui/PagedTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { CancelDocModal } from '@/features/purchase/components/CancelDocModal'
import { fetchFile } from '@/features/sales/print/printing'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { monthLabel, payrollApi } from '../api/staff.api'
import type { PayrollRow } from '../types'
import { LeaveBox } from './LeaveBox'
import { PayslipModal } from './PayslipModal'

type Props = { version: number; onAdvance: (staffId: number, month: string) => void }

// Staff & salary → "Monthly salary": everyone's pay for a month — salary − leave cut − advance taken + per-piece work —
// type the leave right in the list, Pay (makes a payslip), print the payslip, or give an advance.
// Paid per day: type the days worked in the same box; pay = amount per day × days.
// Filter: a person on salary who also does per-piece work shows under both.
type Show = 'all' | 'salary' | 'day' | 'piece'
const SHOW = [{ value: 'all', label: 'All staff' }, { value: 'salary', label: 'Monthly salary' }, { value: 'day', label: 'Per day' }, { value: 'piece', label: 'Per piece' }]
export function PayrollSheet({ version, onAdvance }: Props) {
  const toast = useToast()
  const [month, setMonth] = useState(() => todayISO().slice(0, 7))
  const [show, setShow] = useState<Show>('all')
  const [paying, setPaying] = useState<PayrollRow | null>(null)
  const [cancelling, setCancelling] = useState<PayrollRow | null>(null)
  const q = useApiQuery(['payroll', month, version], () => payrollApi.sheet(month))
  const pdf = (id: number) => fetchFile(payrollApi.pdfPath(id)).catch((e) => toast.error(e instanceof Error ? e.message : 'Could not download'))
  const data = q.data ?? q.lastData // keep the list on screen while it refreshes (the cursor stays in its box)
  const rows = (data?.rows ?? []).filter((r) => show === 'all' || (show === 'salary' ? r.dayRate === 0 && r.salary > 0 : show === 'day' ? r.dayRate > 0 : r.isPiece))
  const sum = (f: (r: PayrollRow) => number) => rows.reduce((s, r) => s + f(r), 0)
  const t = { toPay: sum((r) => (r.payslip ? 0 : r.toPay)), paid: sum((r) => Number(r.payslip?.netPaid ?? 0)), people: rows.length, done: rows.filter((r) => r.payslip).length }

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
    {
      key: 'salary',
      header: 'Salary',
      align: 'right',
      render: (r) => (r.dayRate > 0 ? (
        <span className="block">
          <span className="block">{formatINR(r.salary)}</span>
          <span className="block text-xs text-muted">{r.workedDays} days × {formatINR(r.dayRate)}</span>
        </span>
      ) : r.salary > 0 ? formatINR(r.salary) : <span className="text-muted">—</span>),
    },
    {
      key: 'leave',
      header: 'Leave / days worked',
      render: (r) => (r.dayRate > 0 || r.salary > 0 ? <LeaveBox key={`${r.staff.id}-${month}`} row={r} month={month} onSaved={q.reload} /> : <span className="text-muted">—</span>),
    },
    { key: 'cut', header: 'Leave cut', align: 'right', render: (r) => (r.leaveCut > 0 ? <span className="text-danger">− {formatINR(r.leaveCut)}</span> : <span className="text-muted">—</span>) },
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
        <Select label="Show" value={show} onChange={(e) => setShow(e.target.value as Show)} options={SHOW} className="w-44" />
        <ExportButton path="/payroll/export" params={{ month }} />
        {data && (
          <p className="text-sm text-muted sm:ml-auto">
            {monthLabel(month)}: <b className="text-ink">{t.done} of {t.people}</b> paid · paid {formatINR(t.paid)} · still to pay <b className="text-ink">{formatINR(t.toPay)}</b>
          </p>
        )}
      </div>
      <Card bodyClassName="p-0">
        {q.error ? (
          <EmptyState title="Couldn't load salaries" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
        ) : (
          <PagedTable
            numbered
            columns={columns}
            rows={rows}
            rowKey={(r) => r.staff.id}
            loading={q.loading && !data}
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
