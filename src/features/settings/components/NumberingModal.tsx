import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { numberingApi, previewDocNo, type Layout, type LayoutOption, type Series } from '../numbering'

type Props = { series: Series; layouts: LayoutOption[]; onClose: () => void; onSaved: () => void }

// Change how one document type is numbered: letters, layout, digits, and the next number.
export function NumberingModal({ series: s, layouts, onClose, onSaved }: Props) {
  const toast = useToast()
  const [prefix, setPrefix] = useState(s.prefix)
  const [layout, setLayout] = useState<Layout>(s.layout)
  const [digits, setDigits] = useState(String(s.digits))
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const yearly = layouts.find((l) => l.key === layout)?.yearly ?? true
  const formatChanged = prefix !== s.prefix || layout !== s.layout || Number(digits) !== s.digits
  // Switching between "with year" and "no year" uses a different counter — its next number may differ.
  const nextShown = Number(next) || (formatChanged && yearly !== s.yearly ? 1 : s.nextNumber)
  const fmt = { prefix: prefix.toUpperCase(), layout, digits: Number(digits) || 1 }

  const save = async () => {
    if (!/^[A-Z0-9]{1,8}$/i.test(prefix)) return setError('Letters: 1–8 letters or digits, no spaces or symbols')
    if (next && !(Number(next) > 0)) return setError('Next number must be above 0')
    setBusy(true)
    try {
      if (formatChanged) await numberingApi.saveFormat(s.key, fmt)
      if (next) await numberingApi.setNext(s.key, Number(next))
      toast.success(`${s.label}: next number ${previewDocNo(fmt, s.financialYear, nextShown)}`)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={s.label} description="Numbers already given never change — only new documents use this." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!formatChanged && !next} onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Letters" value={prefix} maxLength={8} onChange={(e) => { setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError('') }} hint="e.g. SDB, SAI, STJ (letters / digits)" />
        <Select label="Digits" value={digits} onChange={(e) => setDigits(e.target.value)} options={[1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: d === 1 ? 'As is (1, 2 … 101)' : `${d} digits (${'1'.padStart(d, '0')})` }))} />
        <Select
          label="Layout"
          value={layout}
          onChange={(e) => { setLayout(e.target.value as Layout); setError('') }}
          options={layouts.map((l) => ({ value: l.key, label: `${previewDocNo({ ...fmt, layout: l.key }, s.financialYear, 101)}  —  ${l.label}` }))}
          className="sm:col-span-2"
          hint={yearly ? 'Has the year → starts again at 1 every April' : 'No year → keeps counting, never restarts'}
        />
        <Input label="Next number (optional)" type="number" inputMode="numeric" min={1} value={next} onChange={(e) => { setNext(e.target.value); setError('') }} placeholder={String(nextShown)} hint="To continue from the old book — can only move forward" className="sm:col-span-2" />
      </div>
      <div className="mt-4 rounded-card bg-page px-4 py-3">
        <p className="text-xs text-muted">Next {s.label.toLowerCase()} will be</p>
        <p className="font-mono text-lg font-semibold text-ink">{previewDocNo(fmt, s.financialYear, nextShown)}</p>
      </div>
      {error && <p role="alert" className="mt-3 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
