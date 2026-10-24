import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { tailorApi } from '@/features/workshop/api/workshop.api'
import { ApiError } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { useApiQuery } from '@/lib/useApiQuery'
import { brandOrderApi } from '../api/brandOrder.api'
import type { BrandOrder, BrandPiece } from '../types'

type Props = { order: BrandOrder; piece: BrandPiece; onClose: () => void; onDone: () => void }

// Order page → "Assign tailor" on one piece: who stitches it and the pay per piece (their usual rate for the garment).
export function BrandTailorModal({ order, piece, onClose, onDone }: Props) {
  const toast = useToast()
  const workers = useApiQuery('tailor-options', () => tailorApi.options())
  const [tailorId, setTailorId] = useState(piece.tailorId ? String(piece.tailorId) : '')
  const [rate, setRate] = useState(Number(piece.labourRate) ? String(Number(piece.labourRate)) : '')
  const [busy, setBusy] = useState(false)
  const list = (workers.data ?? []).filter((w) => w.stitches || w.id === piece.tailorId)
  const tailor = list.find((w) => String(w.id) === tailorId)
  const salaried = tailor?.payType === 'SALARY'

  const pick = (id: string) => {
    setTailorId(id)
    const w = list.find((x) => String(x.id) === id)
    if (!w) return setRate('')
    if (w.payType === 'SALARY') return setRate('')
    const usual = w.rates.find((r) => r.garmentTypeId === piece.garmentTypeId)
    if (usual) setRate(String(Number(usual.rate)))
  }
  const save = async () => {
    if (tailor && !salaried && !(Number(rate) > 0)) return toast.error('Enter the tailor pay per piece')
    setBusy(true)
    try {
      await brandOrderApi.setTailor(order.id, piece.id, tailor ? tailor.id : null, salaried ? 0 : Number(rate) || 0)
      toast.success(tailor ? `${tailor.name} will stitch ${piece.description}` : 'Tailor taken off')
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Tailor — ${piece.qty} × ${piece.description}`} description={piece.endCustomer ? `For ${piece.endCustomer}` : undefined}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Tailor" placeholder={workers.loading ? 'Loading…' : 'Decide later'} value={tailorId} onChange={(e) => pick(e.target.value)}
          options={list.map((w) => ({ value: String(w.id), label: `${w.name}${w.payType === 'SALARY' ? ' (salary)' : ''}` }))} />
        {!salaried && <Input label="Tailor pay / piece ₹" type="number" inputMode="decimal" min={0} value={rate} onChange={(e) => setRate(e.target.value)} disabled={!tailor} />}
      </div>
      {tailor && (
        <p className="mt-3 text-xs text-muted">
          {salaried
            ? `${tailor.name} is on salary — no extra pay for this piece.`
            : `The shop will owe ${tailor.name} ${formatINR(piece.qty * (Number(rate) || 0))} when this piece is marked Ready.`}
        </p>
      )}
    </Modal>
  )
}
