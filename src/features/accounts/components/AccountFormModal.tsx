import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { kindOptions } from '../accountsUtils'
import { accountsApi } from '../api/accounts.api'
import type { Account, AccountKind } from '../types'

type Props = { account: Account | null; onClose: () => void; onSaved: () => void }

const EXAMPLES: Record<AccountKind, string> = {
  ASSET: 'Sewing machines, Furniture, Computer, Security deposit',
  LIABILITY: 'Bank loan, Loan from relative, Rent payable',
  EQUITY: 'Partner capital',
  INCOME: 'Interest received, Rent received',
  DIRECT_EXPENSE: 'Carriage inward, Packing material',
  INDIRECT_EXPENSE: 'Depreciation, Bank charges, Interest paid',
}

// Add / edit an account of your own (machines, loans, depreciation …). Built-in accounts can't be changed.
export function AccountFormModal({ account, onClose, onSaved }: Props) {
  const toast = useToast()
  const [name, setName] = useState(account?.name ?? '')
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'ASSET')
  const [notes, setNotes] = useState(account && !account.builtIn && account.hint !== 'Added by you' ? account.hint : '')
  const [active, setActive] = useState(account?.isActive ?? true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (name.trim().length < 2) return setError('Enter the account name')
    setSaving(true)
    try {
      const body = { name: name.trim(), kind, notes: notes.trim() || null, isActive: active }
      if (account?.id) await accountsApi.updateAccount(account.id, body)
      else await accountsApi.createAccount(body)
      toast.success(account ? 'Account saved' : `Account "${body.name}" added`)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
      setSaving(false)
    }
  }
  const remove = async () => {
    if (!account?.id) return
    setSaving(true)
    try {
      await accountsApi.removeAccount(account.id)
      toast.success('Account deleted')
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={account ? `Edit ${account.name}` : 'Add an account'} description="For things the shop's documents don't cover — machines, loans, depreciation …"
      footer={<>{account?.id && <Button variant="danger" onClick={remove} disabled={saving}>Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>Save</Button></>}>
      <div className="flex flex-col gap-4">
        <Select label="Group" value={kind} onChange={(e) => setKind(e.target.value as AccountKind)} options={kindOptions} hint={`e.g. ${EXAMPLES[kind]}`} />
        <Input label="Account name" required value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder={EXAMPLES[kind].split(',')[0]} autoFocus />
        <Input label="Note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What this account is for" />
        {account && <Switch label="Active" hint="Inactive accounts can't be used in new journal entries" checked={active} onChange={setActive} />}
      </div>
      {error && <p role="alert" className="mt-4 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  )
}
