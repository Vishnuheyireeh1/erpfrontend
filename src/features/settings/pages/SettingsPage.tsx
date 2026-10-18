import { IconHistory, IconListDetails } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { api, ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/useApiQuery'
import { systemApi } from '../api/system.api'
import { BackupCard } from '../components/BackupCard'
import { GoLiveCard } from '../components/GoLiveCard'
import { BillingSettingsCard } from '../components/BillingSettingsCard'
import { BusinessProfileCard } from '../components/BusinessProfileCard'
import { JobsSettingsCard } from '../components/JobsSettingsCard'
import { OpeningBalanceCard } from '../components/OpeningBalanceCard'
import { NumberingCard } from '../components/NumberingCard'
import { useBusinessProfile } from '../hooks/useBusinessProfile'

// /settings — business profile + app-wide switches (every change is recorded in the audit log).
export function SettingsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { settings, error, reload } = useBusinessProfile()
  const check = useApiQuery('golive-checklist', () => systemApi.checklist())

  const saveSwitch = async (key: string, value: boolean) => {
    try {
      await api.put('/settings', { [key]: value })
      toast.success('Setting saved')
      reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Shop details and how the ERP behaves. Changes are recorded in the audit log." />
      {error && !settings ? (
        <Card><EmptyState title="Couldn't load settings" description={error} action={<Button onClick={reload}>Try again</Button>} /></Card>
      ) : !settings ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* key → form resets to the saved (cleaned) values after each save */}
          <GoLiveCard data={check.data ?? check.lastData ?? null} />
          <BackupCard onChanged={check.reload} />
          <BusinessProfileCard key={JSON.stringify(settings['business.profile'])} profile={settings['business.profile']} onSaved={() => { reload(); check.reload() }} />
          <BillingSettingsCard key={JSON.stringify(settings['billing.print'])} settings={settings} onSaved={reload} />
          <JobsSettingsCard key={JSON.stringify(settings['jobs.gst'])} settings={settings} onSaved={reload} />
          <NumberingCard />
          <OpeningBalanceCard key={JSON.stringify(settings['money.opening'])} settings={settings} onSaved={() => { reload(); check.reload() }} />
          <Card title="Inventory">
            <Switch
              label="Allow stock to go below zero"
              hint="Off (recommended): a bill or adjustment that needs more stock than recorded is blocked. Turn on only while stock counts are still being corrected."
              checked={settings['inventory.allowNegativeStock']}
              onChange={(v) => saveSwitch('inventory.allowNegativeStock', v)}
            />
          </Card>
          <Card title="Master data">
            <p className="mb-3 text-sm text-ink-soft">Categories, brands, units, sizes, colours and GST rates.</p>
            <Button icon={IconListDetails} onClick={() => navigate('/masters')}>Open masters</Button>
          </Card>
          <Card title="Activity log">
            <p className="mb-3 text-sm text-ink-soft">Every bill, payment, cancel and setting change — who did it and when.</p>
            <Button icon={IconHistory} onClick={() => navigate('/settings/activity')}>Open activity log</Button>
          </Card>
        </div>
      )}
    </>
  )
}
