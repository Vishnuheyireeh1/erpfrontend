// Must match the backend's /api/masters/:master keys.
export type MasterKey = 'categories' | 'brands' | 'units' | 'sizes' | 'colours' | 'taxRates'

export type MasterRow = {
  id: number
  name: string
  isActive: boolean
  // categories
  parentId?: number | null
  description?: string | null
  parent?: { id: number; name: string } | null
  _count?: { children: number }
  // units
  code?: string
  allowDecimal?: boolean
  // sizes
  sortOrder?: number
  // colours
  hexCode?: string | null
  // tax rates (Decimal comes back as a string)
  rate?: string
}

export type ListResult = {
  items: MasterRow[]
  total: number
  page: number
  pageSize: number
}

export type StatusFilter = 'all' | 'active' | 'inactive'

export type ListParams = {
  search?: string
  page: number
  pageSize: number
  status: StatusFilter
  parentId?: 'root' | number
}

// Form field kinds the generic master form can render.
export type FieldType = 'text' | 'textarea' | 'number' | 'switch' | 'colour' | 'parent'

export type FieldDef = {
  name: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  hint?: string
}

export type FormValues = Record<string, string | boolean>
