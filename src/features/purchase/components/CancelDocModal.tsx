import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'

type Props = {
  docNo: string
  effect: string // what cancelling does, e.g. "The stock from this bill will be taken out again."
  onCancel: (reason: string) => Promise<unknown>
  onClose: () => void
  onDone: () => void
}

// "Cancel document?" with a required reason. Documents are never deleted — they stay as Cancelled.
export function CancelDocModal({ docNo, effect, onCancel, onClose, onDone }: Props) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (reason.trim().length < 3) return setError('Enter why it is cancelled')
    setBusy(true)
    try {
      await onCancel(reason.trim())
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel')
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Cancel ${docNo}?`}
      description={`${effect} It stays in the history as Cancelled.`}
      footer={<><Button onClick={onClose}>Keep it</Button><Button variant="danger" loading={busy} onClick={submit}>Cancel document</Button></>}
    >
      <Input label="Reason" required placeholder="Entered by mistake" value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} error={error} autoFocus />
    </Modal>
  )
}
