import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/toast-context'
import { api, ApiError } from '@/lib/api'
import type { AppSettings } from '../hooks/useBusinessProfile'

type Props = { settings: AppSettings; onSaved: () => void }

// Stitching jobs: is GST added on new jobs by default, and at what rate (each job can still be ticked / unticked).
export function JobsSettingsCard({ settings, onSaved }: Props) {
  const toast = useToast()
  const saved = settings['jobs.gst']
  const registered = settings['business.profile'].gstRegistered
  const [defaultOn, setDefaultOn] = useState(saved.defaultOn)
  const [rate, setRate] = useState(String(saved.rate))
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await api.put('/settings', { 'jobs.gst': { defaultOn, rate: Number(rate) || 0 } })
      toast.success('Job settings saved')
      onSaved()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Stitching jobs">
      <div className="flex flex-col gap-4">
        {!registered && <p className="rounded-control bg-page px-3 py-2 text-sm text-muted">The shop is not GST registered (Business profile), so jobs are billed without GST.</p>}
        <Switch label="Add GST on new jobs" hint="Only the starting value — tick or untick it on each job" checked={defaultOn} onChange={setDefaultOn} />
        <Input label="GST rate on stitching %" type="number" inputMode="decimal" min={0} max={28} value={rate} onChange={(e) => setRate(e.target.value)} hint="Tailoring is usually 5% — confirm with your accountant" className="sm:w-64" />
        <Button variant="primary" loading={busy} onClick={save} className="w-fit">Save</Button>
      </div>
    </Card>
  )
}
