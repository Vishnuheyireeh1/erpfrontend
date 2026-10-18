export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'CHEQUE'
export type DocStatus = 'POSTED' | 'CANCELLED'

export type Supplier = {
  id: number
  code: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  gstin: string | null
  stateCode: string
  stateName?: string
  address: string | null
  city: string | null
  pincode: string | null
  openingBalance: string
  notes: string | null
  isActive: boolean
  billed?: number
  paid?: number
  returned?: number
  balance: number // + = we owe them
}

export type BillSummary = {
  id: number
  docNo: string
  supplierInvoiceNo: string
  supplierInvoiceDate: string
  docDate: string
  status: DocStatus
  taxMode: 'INTRA' | 'INTER'
  grandTotal: string
  paidAmount: string
  returnedAmount: string
  dueAmount: number
  supplier: { id: number; name: string; code: string }
  _count?: { lines: number }
}

export type BillLine = {
  id: number
  qty: string
  rate: string
  discountPct: string
  taxable: string
  gstRate: string
  cgst: string
  sgst: string
  igst: string
  lineTotal: string
  unitCost: string
  returnedQty: string
  variant: {
    id: number
    sku: string
    barcode: string
    size: { name: string } | null
    colour: { name: string } | null
    product: { id: number; name: string; hsnCode: string | null; unit: { code: string } }
  }
}

export type Bill = Omit<BillSummary, 'supplier'> & {
  supplier: Supplier
  supplierStateName: string
  taxableTotal: string
  cgstTotal: string
  sgstTotal: string
  igstTotal: string
  otherCharges: string
  billDiscount: string
  billDiscountPct: string
  chargesGstRate: string
  chargesTax: string
  freightSeparate: string
  freightNote: string | null
  freightMode: PaymentMode | null // transporter paid by (null = still to pay)
  freightPaidOn: string | null
  roundOff: string
  notes: string | null
  createdBy: string
  createdAt: string
  cancelledBy: string | null
  cancelledAt: string | null
  cancelReason: string | null
  lines: BillLine[]
  allocations: { id: number; amount: string; payment: { id: number; docNo: string; docDate: string; mode: PaymentMode; reference: string | null } }[]
  returns: { id: number; docNo: string; docDate: string; grandTotal: string; status: DocStatus }[]
}

export type Payment = {
  id: number
  docNo: string
  docDate: string
  amount: string
  mode: PaymentMode
  reference: string | null
  notes: string | null
  status: DocStatus
  supplier: { id: number; name: string; code?: string }
  allocated?: number
  advance?: number
  cancelReason?: string | null
  allocations?: { id: number; amount: string; invoice: { id: number; docNo: string; supplierInvoiceNo: string } }[]
}

export type UnpaidBill = { id: number; docNo: string; docDate: string; supplierInvoiceNo: string; grandTotal: string; dueAmount: number }

export type StatementRow = { type: 'BILL' | 'PAYMENT' | 'RETURN'; id: number; docNo: string; date: string; detail: string; debit: number; credit: number; balance: number }
export type Statement = { supplier: Supplier; opening: number; rows: StatementRow[]; closing: number }

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number }
