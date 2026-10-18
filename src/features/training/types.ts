import type { PaymentMode } from '@/features/purchase/types'

export type { Paged, PaymentMode } from '@/features/purchase/types'
export type EnrolmentStatus = 'STUDYING' | 'COMPLETED' | 'DROPPED'

export type Course = { id: number; name: string; months: number; fee: string; description: string | null; isActive: boolean; sortOrder: number; batchCount: number }

export type Batch = {
  id: number
  courseId: number
  name: string
  timing: string | null
  startDate: string
  teacherId: number | null
  isActive: boolean
  notes: string | null
  course: { id: number; name: string; fee: string }
  teacher: { id: number; name: string } | null
  students: number
  feesDue: number
}

export type FeeReceipt = {
  id: number
  docNo: string
  docDate: string
  amount: string
  mode: PaymentMode
  reference: string | null
  notes: string | null
  status: 'POSTED' | 'CANCELLED'
  cancelReason: string | null
  createdBy: string
  enrolmentId: number
}

export type Enrolment = {
  id: number
  batchId: number
  joinedOn: string
  status: EnrolmentStatus
  notes: string | null
  fee: number
  paid: number
  due: number
  batch: { id: number; name: string; timing: string | null; isActive: boolean; course: { id: number; name: string; months: number } }
  receipts?: FeeReceipt[]
}

export type Student = {
  id: number
  code: string
  name: string
  phone: string | null
  guardianPhone: string | null
  address: string | null
  notes: string | null
  enrolments: Enrolment[]
  fee?: number
  paid?: number
  due?: number
}

// A receipt with its student + course (lists, printing).
export type FeeReceiptFull = FeeReceipt & {
  enrolment: { id: number; fee: string; student: { id: number; code: string; name: string; phone: string | null }; batch: { id: number; name: string; course: { name: string } } }
  balance?: { fee: number; paid: number; due: number }
}

export type PendingFee = { enrolmentId: number; studentId: number; code: string; name: string; phone: string | null; guardianPhone: string | null; course: string; batch: string; joinedOn: string; fee: number; paid: number; due: number; lastPaid: string | null }
