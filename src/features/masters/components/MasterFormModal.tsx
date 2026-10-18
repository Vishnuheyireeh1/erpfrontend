import { IconTrash } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { mastersApi } from '../api/masters.api'
import type { MasterMeta } from '../config/masters.config'
import { toFormValues, toPayload, validate } from '../formValues'
import type { FormValues, MasterRow } from '../types'
import { MasterField } from './MasterField'

type Props = {
  meta: MasterMeta
  row: MasterRow | null // null = add new
  parents: MasterRow[]
  onClose: () => void
  onSaved: () => void
  onDelete: (row: MasterRow) => void
}

// Add / edit form for any master. Mount it with a `key` so it resets per row.
export function MasterFormModal({ meta, row, parents, onClose, onSaved, onDelete }: Props) {
  const toast = useToast()
  const [values, setValues] = useState<FormValues>(() => toFormValues(meta.fields, row))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const isEdit = row !== null
  const formId = `master-form-${meta.key}`

  const setField = (name: string, value: string | boolean) => {
    setValues((v) => ({ ...v, [name]: value }))
    setErrors((e) => ({ ...e, [name]: '' }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(meta.fields, values)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const body = toPayload(meta.fields, values)
      if (isEdit) await mastersApi.update(meta.key, row.id, body)
      else await mastersApi.create(meta.key, body)
      toast.success(`${capitalize(meta.singular)} ${isEdit ? 'updated' : 'added'}`)
      onSaved()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${meta.singular}` : `Add ${meta.singular}`}
      description={isEdit ? row.name : meta.description}
      footer={
        <>
          {isEdit && (
            <Button variant="danger" icon={IconTrash} onClick={() => onDelete(row)} className="sm:mr-auto">
              Delete
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId} loading={saving}>
            {isEdit ? 'Save changes' : `Add ${meta.singular}`}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {meta.fields.map((field) => (
          <MasterField
            key={field.name}
            field={field}
            value={values[field.name]}
            error={errors[field.name]}
            parents={parents}
            editingId={row?.id}
            onChange={(v) => setField(field.name, v)}
          />
        ))}
        {formError && (
          <p role="alert" className="rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  )
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
