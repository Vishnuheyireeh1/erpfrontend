import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { MasterPanel } from '../components/MasterPanel'
import { masterByKey, masters } from '../config/masters.config'
import type { MasterKey } from '../types'

// /masters?tab=brands — the tab lives in the URL so refresh / back keep it.
export function MastersPage() {
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab') as MasterKey | null
  const active: MasterKey = tabParam && tabParam in masterByKey ? tabParam : 'categories'
  const meta = masterByKey[active]

  return (
    <>
      <PageHeader title="Masters" subtitle="Basic lists used by products, bills and jobs." />
      <div className="mb-5">
        <Tabs
          tabs={masters.map(({ key, label, icon }) => ({ key, label, icon }))}
          active={active}
          onChange={(key) => setParams({ tab: key }, { replace: true })}
        />
      </div>
      <p className="mb-4 text-muted">{meta.description}</p>
      {/* key → each tab gets fresh search / filter state */}
      <MasterPanel key={active} meta={meta} />
    </>
  )
}
