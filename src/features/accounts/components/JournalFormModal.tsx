import { IconPlus, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { controlClass } from '@/components/ui/controlClass'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { todayISO } from '@/features/inventory/constants'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatINR2 } from '@/lib/format'
import { kindLabel } from '../accountsUtils'
import { accountsApi } from '../api/accounts.api'
import type { Account, AccountKind } from '../types'

type Row = { key: number; accountCode: string; debit: string; credit: string; note: string }
let seq = 0
const row = (accountCode = '', debit = '', credit = ''): Row => ({ key: ++seq, accountCode, debit, credit, note: '' })

type Gst = { out: number; in: number } // GST collected (to pay) and GST paid on purchases (to claim) in the books
const money = (n: number) => (n > 0 ? String(Math.round(n * 100) / 100) : '')

// Common entries, so the owner doesn't have to think about which side is which. GST ones fill the amount from the
// books on the entry date (check it against the GST return / challan before saving).
const TEMPLATES: { label: string; narration: string; rows: (g: Gst) => Row[]; gst?: boolean }[] = [
  // Pay what is left after setting off the input: collected − input (never below 0).
  { label: 'GST paid to government', narration: 'GST paid for the month', gst: true, rows: (g) => { const a = money(g.out - g.in); return [row('2200', a), row('1010', '', a)] } },
  // Use the GST paid on purchases against the GST collected (the smaller of the two).
  { label: 'GST input set off', narration: 'GST input set off against GST collected', gst: true, rows: (g) => { const a = money(Math.min(g.out, g.in)); return [row('2200', a), row('1300', '', a)] } },
  { label: 'Blank entry', narration: '', rows: () => [row(), row()] },
]

type Props = { accounts: Account[]; locked: string[]; onClose: () => void; onSaved: () => void }

// New journal entry (JV/…): for the owner / CA — capital, machines, loans, depreciation, GST payment …
export function JournalFormModal({ accounts, locked, onClose, onSaved }: Props) {
  const toast = useToast()
  const [docDate, setDocDate] = useState(todayISO)
  const [narration, setNarration] = useState('')
  const [rows, setRows] = useState<Row[]>(() => [row(), row()])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [gstNote, setGstNote] = useState('')
  const usable = accounts.filter((a) => a.isActive && !locked.includes(a.code))
  const groups = (Object.keys(kindLabel) as AccountKind[]).map((k) => ({ k, items: usable.filter((a) => a.kind === k) })).filter((g) => g.items.length)
  const dr = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0), cr = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0)
  const diff = Math.round((dr - cr) * 100) / 100
  const set = (key: number, patch: Partial<Row>) => { setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r))); setError('') }

  const applyTemplate = async (t: (typeof TEMPLATES)[number]) => {
    setNarration(t.narration)
    setError('')
    setGstNote('')
    if (!t.gst) return setRows(t.rows({ out: 0, in: 0 }))
    try {
      const b = await accountsApi.balanceSheet(docDate)
      const g = { out: b.liabilities.find((l) => l.code === '2200')?.amount ?? 0, in: b.assets.find((l) => l.code === '1300')?.amount ?? 0 }
      setRows(t.rows(g))
      const left = Math.round((g.out - g.in) * 100) / 100
      setGstNote(`From the books on this date: GST collected ${formatINR2(g.out)} · GST paid on purchases ${formatINR2(g.in)}${t.label.startsWith('GST paid') && left <= 0 ? ' — nothing to pay: GST paid on purchases covers it (use "GST input set off")' : ''}. Check with your GST return before saving.`)
    } catch {
      setRows(t.rows({ out: 0, in: 0 }))
    }
  }

  const save = async () => {
    if (narration.trim().length < 3) return setError('Write what this entry is for')
    const lines = rows.filter((r) => r.accountCode || Number(r.debit) || Number(r.credit))
    if (lines.length < 2) return setError('Add at least two lines — one debit, one credit')
    const bad = lines.findIndex((r) => !r.accountCode || (Number(r.debit) > 0) === (Number(r.credit) > 0))
    if (bad >= 0) return setError(`Line ${bad + 1}: choose the account and enter either debit or credit`)
    if (diff !== 0) return setError(`Debit and credit must be equal (difference ${formatINR2(Math.abs(diff))})`)
    setSaving(true)
    try {
      const j = await accountsApi.createJournal({ docDate, narration: narration.trim(), lines: lines.map((r) => ({ accountCode: r.accountCode, debit: Number(r.debit) || 0, credit: Number(r.credit) || 0, note: r.note.trim() || undefined })) })
      toast.success(`${j.docNo} saved`)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="xl" title="New journal entry" description="Debit = the account that receives / grows · Credit = the account that gives / owes"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save entry</Button></>}>
      <div className="mb-3 flex flex-wrap gap-2">
        {TEMPLATES.map((t) => <Button key={t.label} size="sm" onClick={() => void applyTemplate(t)}>{t.label}</Button>)}
      </div>
      {gstNote && <p className="mb-3 rounded-control bg-info-tint px-3 py-2 text-xs text-ink-soft">{gstNote}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Input label="Date" type="date" max={todayISO()} value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        <Input label="What is this for?" required value={narration} onChange={(e) => { setNarration(e.target.value); setError('') }} placeholder="Sewing machine bought / Depreciation for the year …" />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_2rem] gap-2 text-xs font-medium text-muted sm:grid"><span>Account</span><span className="text-right">Debit ₹</span><span className="text-right">Credit ₹</span><span /></div>
        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-2 gap-2 rounded-control border border-line p-2 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_2rem] sm:border-0 sm:p-0">
            <Select aria-label={`Line ${i + 1} account`} value={r.accountCode} onChange={(e) => set(r.key, { accountCode: e.target.value })} className="col-span-2 sm:col-span-1" placeholder="Choose the account…"
              options={groups.flatMap((g) => g.items.map((a) => ({ value: a.code, label: `${a.name} · ${kindLabel[g.k]}` })))} />
            <input aria-label={`Line ${i + 1} debit`} type="number" inputMode="decimal" min={0} placeholder="Debit" value={r.debit} onChange={(e) => set(r.key, { debit: e.target.value, credit: e.target.value ? '' : r.credit })} className={cn(controlClass(), 'h-10 text-right')} />
            <input aria-label={`Line ${i + 1} credit`} type="number" inputMode="decimal" min={0} placeholder="Credit" value={r.credit} onChange={(e) => set(r.key, { credit: e.target.value, debit: e.target.value ? '' : r.debit })} className={cn(controlClass(), 'h-10 text-right')} />
            <button type="button" aria-label={`Remove line ${i + 1}`} disabled={rows.length <= 2} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="col-span-2 flex h-10 items-center justify-center rounded-control text-muted hover:bg-page hover:text-danger disabled:opacity-30 sm:col-span-1"><IconX size={16} /></button>
          </div>
        ))}
        <Button size="sm" icon={IconPlus} onClick={() => setRows((rs) => [...rs, row()])} className="w-fit">Add line</Button>
      </div>
      <div className={cn('mt-3 flex flex-wrap justify-between gap-2 rounded-control px-3 py-2 text-sm font-medium', diff === 0 && dr > 0 ? 'bg-success-tint text-success' : 'bg-page text-ink')}>
        <span>Debit {formatINR2(dr)} · Credit {formatINR2(cr)}</span>
        <span>{diff === 0 ? (dr > 0 ? 'Balanced ✓' : '') : `Difference ${formatINR2(Math.abs(diff))}`}</span>
      </div>
      <p className="mt-2 text-xs text-muted">Customers, suppliers, tailors and stock can't be changed here — they follow their own bills and payments.</p>
      {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
