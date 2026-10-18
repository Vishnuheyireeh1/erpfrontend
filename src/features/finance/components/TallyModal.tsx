import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate, formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { financeApi } from '../api/finance.api'

type Props = { date: string; onClose: () => void; onSaved: () => void }

// End of day: count the cash in the drawer and compare with what the system expects.
export function TallyModal({ date, onClose, onSaved }: Props) {
  const toast = useToast()
  const q = useApiQuery(['tally', date], () => financeApi.tally(date))
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const expected = q.data?.expected ?? 0
  const diff = counted === '' ? null : Math.round((Number(counted) - expected) * 100) / 100

  const save = async () => {
    if (counted === '') return toast.error('Enter the cash counted')
    setBusy(true)
    try {
      await financeApi.saveTally({ date, counted: Number(counted), note: note.trim() || undefined })
      toast.success(diff === 0 ? 'Cash tallies' : `Saved — ${diff! < 0 ? `short ${formatINR(-diff!)}` : `excess ${formatINR(diff!)}`}`)
      onSaved()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="sm" title={`Count cash — ${formatDate(date)}`} description="Count the notes and coins in the drawer and enter the total." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save count</Button></>}>
      {!q.data ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between rounded-card bg-page px-3 py-2 text-sm"><span className="text-muted">System says cash in hand</span><span className="font-semibold">{formatINR(expected)}</span></div>
          <Input label="Cash counted ₹" type="number" inputMode="decimal" min={0} value={counted} onChange={(e) => setCounted(e.target.value)} autoFocus />
          {diff !== null && (
            <p className={cn('rounded-control px-3 py-2 text-sm font-medium', diff === 0 ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger')}>
              {diff === 0 ? 'Cash tallies ✓' : diff < 0 ? `Cash short by ${formatINR(-diff)}` : `Extra cash ${formatINR(diff)}`}
            </p>
          )}
          <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="₹50 given for auto, not entered" />
          {q.data.saved && <p className="text-xs text-muted">Already counted today: {formatINR(Number(q.data.saved.counted))} by {q.data.saved.createdBy}. Saving again replaces it.</p>}
        </div>
      )}
    </Modal>
  )
}
