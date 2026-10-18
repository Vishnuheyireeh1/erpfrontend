import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/toast-context'
import { api, ApiError } from '@/lib/api'
import type { AppSettings } from '../hooks/useBusinessProfile'

type Props = { settings: AppSettings; onSaved: () => void }

// Cash in hand and bank balance on the go-live day — the day book starts from these.
export function OpeningBalanceCard({ settings, onSaved }: Props) {
  const toast = useToast()
  const saved = settings['money.opening']
  const [cash, setCash] = useState(String(saved.cash))
  const [bank, setBank] = useState(String(saved.bank))
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      await api.put('/settings', { 'money.opening': { cash: Number(cash) || 0, bank: Number(bank) || 0 } })
      toast.success('Opening balances saved')
      onSaved()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card title="Opening cash & bank">
      <p className="mb-3 text-sm text-ink-soft">Count the cash and check the bank balance on the day you start using the system. The day book starts from these.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Cash in hand ₹" type="number" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} />
        <Input label="Bank balance ₹" type="number" inputMode="decimal" value={bank} onChange={(e) => setBank(e.target.value)} />
      </div>
      <Button variant="primary" loading={busy} onClick={save} className="mt-4">Save</Button>
    </Card>
  )
}
