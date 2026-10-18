import { createContext, useContext } from 'react'
import type { Admin } from './api/auth.api'

// loading = checking the cookie on first load · authed = logged in · guest = show login
export type AuthStatus = 'loading' | 'authed' | 'guest'

export type AuthState = {
  status: AuthStatus
  admin: Admin | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
