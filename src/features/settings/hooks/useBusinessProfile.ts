import { api } from '@/lib/api'
import type { BusinessProfile } from '@/lib/gst'
import type { PrintSettings } from '@/features/sales/types'
import { useApiQuery } from '@/lib/useApiQuery'

export type AppSettings = {
  'inventory.allowNegativeStock': boolean
  'business.profile': BusinessProfile
  'billing.apparelGstRule': boolean
  'billing.print': PrintSettings
  'jobs.gst': { defaultOn: boolean; rate: number }
  'money.opening': { cash: number; bank: number }
}

export const loadSettings = () => api.get<{ settings: AppSettings }>('/settings').then((r) => r.settings)

// Shop details (name, GSTIN, state …) used by labels, purchase and bills.
export function useBusinessProfile() {
  const q = useApiQuery('settings', loadSettings)
  const settings = q.data ?? q.lastData
  return { profile: settings?.['business.profile'] ?? null, settings, loading: !settings && q.loading, error: q.error, reload: q.reload }
}
