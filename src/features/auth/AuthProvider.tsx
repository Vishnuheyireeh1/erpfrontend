import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '@/components/ui/toast-context'
import { AUTH_EXPIRED_EVENT } from '@/lib/api'
import { authApi, type Admin } from './api/auth.api'
import { AuthContext, type AuthState, type AuthStatus } from './auth-context'

// Holds the logged-in admin. The session itself lives in an httpOnly cookie.
export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [admin, setAdmin] = useState<Admin | null>(null)

  // On first load: is there still a valid session cookie?
  useEffect(() => {
    authApi
      .me()
      .then((a) => {
        setAdmin(a)
        setStatus('authed')
      })
      .catch(() => setStatus('guest'))
  }, [])

  // Any API call that comes back 401 → back to the login page (toast only once).
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    const onExpired = () => {
      if (statusRef.current === 'authed') toast.error('Your session expired. Log in again.')
      statusRef.current = 'guest'
      setAdmin(null)
      setStatus('guest')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [toast])

  const login = useCallback(async (username: string, password: string) => {
    const a = await authApi.login(username, password)
    setAdmin(a)
    setStatus('authed')
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined)
    setAdmin(null)
    setStatus('guest')
  }, [])

  const value = useMemo<AuthState>(
    () => ({ status, admin, login, logout }),
    [status, admin, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
