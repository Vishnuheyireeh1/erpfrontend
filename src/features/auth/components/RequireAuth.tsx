import { Navigate, Outlet, useLocation } from 'react-router-dom'
import swan from '@/assets/swan.png'
import { Spinner } from '@/components/ui/Feedback'
import { useAuth } from '../auth-context'

// Guards every app page: loading → splash, guest → /login (remembers where you were going).
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <img src={swan} alt="Sairandhri" className="size-16 object-contain" />
        <Spinner size={24} />
      </div>
    )
  }

  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
