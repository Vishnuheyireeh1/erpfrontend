import type { FieldDef, FormValues, MasterRow } from './types'

// Row → form values (strings for inputs, booleans for switches).
export function toFormValues(fields: FieldDef[], row: MasterRow | null): FormValues {
  const values: FormValues = {}
  for (const f of fields) {
    const raw = row ? (row as Record<string, unknown>)[f.name] : undefined
    if (f.type === 'switch') {
      values[f.name] = row ? Boolean(raw) : f.name === 'isActive'
    } else {
      values[f.name] = raw === null || raw === undefined ? '' : String(raw)
    }
  }
  return values
}

// Form values → API body (numbers, nulls for empty optional fields).
export function toPayload(fields: FieldDef[], values: FormValues) {
  const body: Record<string, unknown> = {}
  for (const f of fields) {
    const v = values[f.name]
    if (f.type === 'switch') body[f.name] = Boolean(v)
    else if (f.type === 'number') body[f.name] = v === '' ? undefined : Number(v)
    else if (f.type === 'parent') body[f.name] = v === '' ? null : Number(v)
    else if (f.type === 'colour' || f.type === 'textarea') body[f.name] = v === '' ? null : String(v).trim()
    else body[f.name] = String(v).trim()
  }
  return body
}

// Required-field check before calling the API (server validates again).
export function validate(fields: FieldDef[], values: FormValues) {
  const errors: Record<string, string> = {}
  for (const f of fields) {
    if (f.required && String(values[f.name] ?? '').trim() === '') {
      errors[f.name] = `Enter ${f.label.toLowerCase()}`
    }
    if (f.type === 'number' && values[f.name] !== '' && Number.isNaN(Number(values[f.name]))) {
      errors[f.name] = 'Enter a number'
    }
  }
  return errors
}
