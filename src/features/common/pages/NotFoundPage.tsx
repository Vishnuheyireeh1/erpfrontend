import { IconMapPinOff } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/Feedback'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Card>
      <EmptyState
        icon={IconMapPinOff}
        title="Page not found"
        description="The page you're looking for doesn't exist or was moved."
        action={
          <Button variant="primary" onClick={() => navigate('/')}>
            Go to dashboard
          </Button>
        }
      />
    </Card>
  )
}
