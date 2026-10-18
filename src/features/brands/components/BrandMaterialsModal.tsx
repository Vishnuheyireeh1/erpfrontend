import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { ProductLinesEditor } from '@/features/jobs/components/ProductLinesEditor'
import { productError, type ProductDraft } from '@/features/jobs/jobDrafts'
import { ApiError } from '@/lib/api'
import { brandOrderApi } from '../api/brandOrder.api'
import { BRAND_LINE_LABELS, toMaterialInput } from '../orderDrafts'
import type { BrandOrder, BrandPiece } from '../types'

type Props = { order: BrandOrder; piece: BrandPiece; onClose: () => void; onDone: () => void }

// Cloth / lining / buttons from our stock for one piece — leaves stock now; charged ones are billed with the piece.
export function BrandMaterialsModal({ order, piece, onClose, onDone }: Props) {
  const toast = useToast()
  const [rows, setRows] = useState<ProductDraft[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setShowErrors(true)
    if (!rows.length) return toast.error('Scan or search the items')
    if (rows.some(productError)) return toast.error('Fix the highlighted items')
    setBusy(true)
    try {
      await brandOrderApi.addMaterials(order.id, piece.id, rows.map(toMaterialInput))
      toast.success('Items added — taken out of stock')
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Stock items · ${piece.description}${piece.endCustomer ? ` for ${piece.endCustomer}` : ''}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Add items</Button></>}
    >
      <ProductLinesEditor rows={rows} onChange={setRows} showErrors={showErrors} labels={BRAND_LINE_LABELS} placeholder="Scan or search our cloth, lining, buttons…" />
    </Modal>
  )
}
