import type { PaymentMode } from '@/features/purchase/types'

export type { Paged, PaymentMode } from '@/features/purchase/types'
export type StaffDept = 'WORKSHOP' | 'SHOP'

export type Staff = {
  id: number
  code: string
  name: string
  phone: string | null
  address: string | null
  role: string
  dept: StaffDept
  salary: string
  joinDate: string | null
  notes: string | null
  isActive: boolean
  paidThisMonth: number
  paidTotal: number
  // Job-work profile (tailors, embroidery, cutting …) — null when they don't do job work.
  worker: StaffWorker | null
}

export type StaffWorker = {
  id: number
  code: string
  payType: 'PIECE' | 'SALARY'
  speciality: string | null
  openingBalance: string
  isActive: boolean
  stitches: boolean
  rates: { garmentTypeId: number; rate: string }[] // stitching pay per garment
  works: { categoryId: number; rate: string }[] // other work (Cutting, Lining …) + usual pay per piece
  earned: number
  paid: number
  balance: number
}

export type StaffInput = {
  name: string
  phone: string
  address: string
  role: string
  dept: StaffDept
  salary: number
  joinDate: string | null
  notes: string
  isActive: boolean
  work: {
    payType: 'PIECE' | 'SALARY'
    openingBalance: number
    stitches: boolean
    rates: { garmentTypeId: number; rate: number }[]
    works: { categoryId: number; rate: number }[]
  } | null
}

export type SalaryPayment = {
  id: number
  docNo: string
  docDate: string
  month: string
  amount: string
  mode: PaymentMode
  reference: string | null
  notes: string | null
  status: 'POSTED' | 'CANCELLED'
  cancelReason: string | null
  createdBy: string
  staff: { id: number; code: string; name: string; role: string; dept: StaffDept }
}

// Monthly salary sheet: one row per staff member for a month.
export type WorkLine = { docNo: string; date: string; detail: string; pieces: number; amount: number }
export type PayrollRow = {
  staff: { id: number; code: string; name: string; role: string; dept: StaffDept; salary: string; isActive: boolean }
  salary: number
  advance: number // salary already paid for the month (advance / part)
  salaryDue: number
  isPiece: boolean
  workerId: number | null
  pieceEarned: number // per-piece work earned this month
  piecePieces: number
  pieceBefore: number // older balance (minus = advance taken)
  pieceDue: number
  work: WorkLine[]
  toPay: number
  payslip: { id: number; docNo: string; netPaid: string; docDate: string } | null
}
export type PayrollSheet = { month: string; rows: PayrollRow[]; totals: { toPay: number; paid: number; people: number; done: number } }

export type Payslip = {
  id: number
  docNo: string
  month: string
  docDate: string
  netPaid: string
  status: 'POSTED' | 'CANCELLED'
  staff: { id: number; code: string; name: string; role: string }
}
