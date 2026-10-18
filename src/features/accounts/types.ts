export type AccountKind = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'DIRECT_EXPENSE' | 'INDIRECT_EXPENSE'

export type Account = { id?: number; code: string; name: string; kind: AccountKind; hint: string; builtIn: boolean; party?: 'customer' | 'supplier' | 'tailor' | 'brand'; isActive: boolean }
export type Chart = { items: Account[]; groups: Record<AccountKind, string>; locked: string[] }
export type LedgerAccount = { id: number; code: string; name: string; kind: AccountKind; notes: string | null; isActive: boolean }

export type TbLine = { code: string; name: string; kind: AccountKind; opening: number; debit: number; credit: number; closing: number }
export type TrialBalance = { from: string; to: string; lines: TbLine[]; totals: { debit: number; credit: number; closingDr: number; closingCr: number }; balanced: boolean }

export type AmountLine = { code: string; name: string; amount: number }
export type ProfitLoss = {
  from: string; to: string
  income: AmountLine[]; incomeTotal: number
  direct: AmountLine[]; directTotal: number
  grossProfit: number
  indirect: AmountLine[]; indirectTotal: number
  netProfit: number
}
export type BalanceSheet = {
  to: string
  assets: AmountLine[]; assetsTotal: number
  liabilities: AmountLine[]; liabilitiesTotal: number
  equity: AmountLine[]; equityTotal: number
  balanced: boolean
}

export type LedgerLine = { key?: number; date: string; src: string; refId: number; docNo: string; party: string; memo: string; debit: number; credit: number; balance: number }
export type Ledger = {
  account: Account; from: string; to: string; party: { code: string; name: string } | null
  opening: number; lines: LedgerLine[]; closing: number; more: boolean; totals: { debit: number; credit: number }
}
export type Party = { code: string; name: string; balance: number }

export type JournalLine = { id: number; accountCode: string; accountName: string; debit: string; credit: string; note: string | null }
export type Journal = {
  id: number; docNo: string; docDate: string; narration: string; total: string; status: 'POSTED' | 'CANCELLED'
  createdBy: string; createdAt: string; cancelReason: string | null; cancelledBy: string | null; lines?: JournalLine[]
}
export type JournalInput = { docDate?: string; narration: string; lines: { accountCode: string; debit: number; credit: number; note?: string }[] }

export type SalesByType = {
  from: string; to: string; by: 'day' | 'month'
  lines: { period: string; shop: number; stitching: number; fees: number; total: number }[]
  totals: { shop: number; stitching: number; fees: number; total: number }
}
