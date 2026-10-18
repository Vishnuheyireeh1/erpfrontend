import { IconTools } from '@tabler/icons-react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Feedback'
import { allNavItems } from '@/config/navigation'

// Stand-in for modules that aren't built yet — title comes from the nav config.
export function PlaceholderPage() {
  const { pathname } = useLocation()
  const item = allNavItems.find((i) => i.path === pathname)
  const title = item?.label ?? 'Coming soon'

  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={item?.icon ?? IconTools}
          title={`${title} is on the way`}
          description="This module will be built in an upcoming step."
        />
      </Card>
    </>
  )
}
