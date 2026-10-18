import { IconBook, IconPencil } from '@tabler/icons-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'

type Props = { bookNo: string | null; docNo: string; onSave: (bookNo: string | null) => Promise<{ warning: string | null }>; onSaved: () => void }

// Bill / job page: the number from the paper bill (order) book — shown as a chip; tap to add or correct it later.
export function BookNoChip({ bookNo, docNo, onSave, onSaved }: Props) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(bookNo ?? '')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      const r = await onSave(value.trim() || null)
      if (r.warning) toast.error(r.warning)
      else toast.success(value.trim() ? `Book no. ${value.trim()} saved` : 'Book no. removed')
      setOpen(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button type="button" onClick={() => { setValue(bookNo ?? ''); setOpen(true) }}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-sm hover:border-brand">
        <IconBook size={16} className="text-muted" aria-hidden />
        {bookNo ? <><span className="text-muted">Book no.</span> <span className="font-semibold text-ink">{bookNo}</span> <IconPencil size={14} className="text-muted" /></> : <span className="font-medium text-brand">+ Book no.</span>}
      </button>
      {open && (
        <Modal open onClose={() => setOpen(false)} size="sm" title={`Book no. — ${docNo}`} description="The number from the paper bill book (optional)."
          footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
          <Input label="Book no." value={value} onChange={(e) => setValue(e.target.value)} maxLength={30} placeholder="2573" autoFocus onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Modal>
      )}
    </>
  )
}
