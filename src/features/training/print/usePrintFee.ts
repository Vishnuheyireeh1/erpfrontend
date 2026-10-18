import { useCallback } from 'react'
import { printText } from '@/features/sales/print/printing'
import { useBusinessProfile } from '@/features/settings/hooks/useBusinessProfile'
import { trainingApi } from '../api/training.api'
import { feeReceiptText } from './feeText'

// Prints a fee receipt on the bill printer (loads it fresh so the balance is current).
export function usePrintFee() {
  const { profile, settings } = useBusinessProfile()
  return useCallback(
    async (receiptId: number) => {
      if (!settings || !profile) return
      const r = await trainingApi.receipt(receiptId)
      printText(feeReceiptText(r, profile, settings['billing.print'].columns), settings['billing.print'])
    },
    [profile, settings],
  )
}
