import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { authApi } from '../api/auth.api'

type Props = { open: boolean; onClose: () => void }

type Errors = { current?: string; next?: string; confirm?: string; form?: string }

const EMPTY = { current: '', next: '', confirm: '' }

// Changing the password logs out every other device; this one stays logged in.
export function ChangePasswordModal({ open, onClose }: Props) {
  const toast = useToast()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)

  const close = () => {
    setValues(EMPTY)
    setErrors({})
    onClose()
  }

  const set = (key: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const next: Errors = {
      current: values.current ? undefined : 'Enter your current password',
      next: values.next.length >= 8 ? undefined : 'Use at least 8 characters',
      confirm: values.confirm === values.next ? undefined : "Passwords don't match",
    }
    setErrors(next)
    if (next.current || next.next || next.confirm) return

    setSaving(true)
    try {
      await authApi.changePassword(values.current, values.next)
      toast.success('Password changed')
      close()
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Something went wrong' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title="Change password"
      description="Other devices will be logged out."
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="change-password-form" loading={saving}>
            Save password
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={values.current}
          onChange={set('current')}
          error={errors.current}
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters"
          value={values.next}
          onChange={set('next')}
          error={errors.next}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set('confirm')}
          error={errors.confirm}
        />
        {errors.form && (
          <p role="alert" className="rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">
            {errors.form}
          </p>
        )}
      </form>
    </Modal>
  )
}
