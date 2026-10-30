export type { Paged } from '@/features/purchase/types'

export type PayType = 'PIECE' | 'SALARY'

export type Tailor = {
  id: number
  code: string
  name: string
  phone: string | null
  speciality: string | null
  payType: PayType
  openingBalance: string
  notes: string | null
  isActive: boolean
  balance: number // + = shop owes the worker
  staffId?: number | null
  staff?: { id: number; code: string; role: string } | null
  earned?: number
  paid?: number
  rates?: { garmentTypeId: number; rate: string; garmentType: { id: number; name: string } }[]
  does?: string[] // Stitching, Cutting, Embroidery … (Workers list)
  period?: { jobs: number; pieces: number; earned: number } // work done between the chosen dates (Workers list)
}

export type GarmentType = {
  id: number
  name: string
  fields: string[]
  defaultCharge: string
  defaultLabour: string
  sortOrder: number
  isActive: boolean
  measurementCount?: number
  costDefaults?: { categoryId: number; rate: string }[] // usual job costs per piece
  charges?: string[] // additional charge options (Lining, Piping …) — amount typed inside the garment on the bill
}

export type CostCategory = { id: number; name: string; defaultPaidBy: 'SALARIED' | 'PAID'; sortOrder: number; isActive: boolean; entryCount?: number }

export type Measurement = {
  id: number
  garmentTypeId: number
  values: Record<string, string>
  notes: string | null
  takenOn: string
  createdBy: string
  createdAt: string
  garmentType: { name: string }
}

export type TailorStatementRow = { type: 'WORK' | 'PAYMENT'; kind?: 'JOB' | 'PRD' | 'BRD'; id: number; docNo: string; date: string; detail: string; pieces: number; earned: number; paid: number; balance: number }
export type TailorStatement = { tailor: Tailor; opening: number; rows: TailorStatementRow[]; closing: number; totals: { earned: number; paid: number; pieces: number } }

export type TailorPayment = {
  id: number
  docNo: string
  docDate: string
  amount: string
  mode: 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'CHEQUE'
  reference: string | null
  notes: string | null
  status: 'POSTED' | 'CANCELLED'
  cancelReason: string | null
  createdBy: string
  tailor: { id: number; name: string; code?: string }
}
