import { IconCash, IconPlus, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ExportButton } from '@/components/ui/ExportButton'
import { EmptyState } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { deptLabels, staffApi } from '../api/staff.api'
import { PayrollSheet } from '../components/PayrollSheet'
import { SalaryList } from '../components/SalaryList'
import { SalaryPayModal } from '../components/SalaryPayModal'
import { StaffFormModal } from '../components/StaffFormModal'
import type { Staff } from '../types'

type Tab = 'active' | 'payroll' | 'salary' | 'inactive'

// /employees — everyone who works for the shop (sales staff, tailors, cutting master, teachers …), how they are paid,
// the monthly salary sheet with payslips, and every salary payment.
export function StaffPage() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'active'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Staff | 'new' | null>(null)
  const [paying, setPaying] = useState<{ staffId?: number; month?: string } | null>(null)
  const [version, setVersion] = useState(0)
  const debounced = useDebounce(search.trim())
  const filters = { search: debounced || undefined, status: tab === 'inactive' ? 'inactive' : 'active' }
  const listTab = tab === 'active' || tab === 'inactive'
  const q = useApiQuery(['staff', filters, page, tab, version], () => (listTab ? staffApi.list({ ...filters, page }) : Promise.resolve(null)))
  const refresh = () => { setVersion((v) => v + 1); q.reload() }
  // /employees?edit=12 (from a worker's page) → that person's form opens once loaded.
  const editId = Number(params.get('edit')) || 0
  const toEdit = useApiQuery(['staff-edit', editId], () => (editId ? staffApi.get(editId) : Promise.resolve(null)))
  const [editDone, setEditDone] = useState(0)
  if (toEdit.data && editDone !== editId) {
    setEditDone(editId)
    setEditing(toEdit.data)
  }

  const columns: Column<Staff>[] = [
    {
      key: 'name',
      header: 'Name',
      mobile: 'title',
      render: (s) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-ink">{s.name}</span>
          <span className="block text-xs text-muted">{s.code} · {s.role}</span>
        </span>
      ),
    },
    { key: 'phone', header: 'Phone', mobile: 'subtitle', render: (s) => s.phone ?? '—' },
    { key: 'dept', header: 'Works in', mobile: 'hidden', render: (s) => deptLabels[s.dept] },
    { key: 'salary', header: 'Monthly salary', align: 'right', render: (s) => formatINR(Number(s.salary)) },
    {
      key: 'paid',
      header: 'Paid this month',
      align: 'right',
      render: (s) => <span className={s.paidThisMonth >= Number(s.salary) && s.paidThisMonth > 0 ? 'text-success' : s.paidThisMonth > 0 ? 'text-warn' : 'text-muted'}>{formatINR(s.paidThisMonth)}</span>,
    },
    {
      key: 'work',
      header: 'Job work',
      render: (s) => !s.worker?.isActive ? <span className="text-muted">—</span> : (
        <Link to={`/tailors/${s.worker.id}`} onClick={(e) => e.stopPropagation()} className="text-brand hover:underline">
          {s.worker.payType === 'PIECE' ? (s.worker.balance > 0.004 ? `To pay ${formatINR(s.worker.balance)}` : 'Per piece') : 'On salary'}
        </Link>
      ),
    },
    { key: 'status', header: '', mobile: 'badge', render: (s) => (!s.isActive ? <Badge>Inactive</Badge> : null) },
  ]

  return (
    <>
      <PageHeader
        title="Staff & salary"
        subtitle="Everyone who works here — sales, tailors, cutting, teachers … Pay salaries with a payslip in Monthly salary."
        actions={
          <>
            {listTab && <ExportButton path="/staff/export" params={filters} />}
            <Button icon={IconCash} onClick={() => setPaying({})}>Give advance</Button>
            <Button variant="primary" icon={IconPlus} onClick={() => setEditing('new')}>Add staff</Button>
          </>
        }
      />
      <div className="mb-4">
        <Tabs
          tabs={[{ key: 'active', label: 'Staff' }, { key: 'payroll', label: 'Monthly salary' }, { key: 'salary', label: 'Salary paid' }, { key: 'inactive', label: 'Inactive' }]}
          active={tab}
          onChange={(t) => { setParams(t === 'active' ? {} : { tab: t }); setPage(1) }}
        />
      </div>
      {tab === 'payroll' ? (
        <PayrollSheet version={version} onAdvance={(staffId, month) => setPaying({ staffId, month })} />
      ) : tab === 'salary' ? (
        <SalaryList version={version} />
      ) : (
        <>
          <Input icon={IconSearch} aria-label="Search staff" placeholder="Name, code, phone or work" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="mb-4 md:w-96" />
          <Card bodyClassName="p-0">
            {q.error ? (
              <EmptyState title="Couldn't load staff" description={q.error} action={<Button onClick={q.reload}>Try again</Button>} />
            ) : (
              <>
                <DataTable
                  startIndex={(page - 1) * 50 + 1}
                  columns={columns}
                  rows={q.data?.items ?? []}
                  rowKey={(s) => s.id}
                  loading={q.loading}
                  emptyTitle={tab === 'inactive' ? 'No inactive staff' : 'No staff yet'}
                  emptyDescription={tab === 'active' ? 'Add everyone — sales staff, tailors, cutting master, teachers.' : undefined}
                  onRowClick={(s) => setEditing(s)}
                />
                {(q.data?.total ?? 0) > 50 && <Pagination page={page} pageSize={50} total={q.data!.total} onPageChange={setPage} />}
              </>
            )}
          </Card>
        </>
      )}
      {editing && <StaffFormModal key={editing === 'new' ? 'new' : editing.id} staff={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh() }} />}
      {paying && <SalaryPayModal staffId={paying.staffId} month={paying.month} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); refresh() }} />}
    </>
  )
}
