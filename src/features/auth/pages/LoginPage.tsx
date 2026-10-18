import { IconEye, IconEyeOff, IconLock, IconUser } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import logo from '@/assets/logo.png'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ApiError } from '@/lib/api'
import { useAuth } from '../auth-context'

const YEAR = new Date().getFullYear()

// Single admin login. Centred card on every screen size.
export function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authed') return <Navigate to={from} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errors = {
      username: username.trim() ? undefined : 'Enter your username',
      password: password ? undefined : 'Enter your password',
    }
    setFieldErrors(errors)
    setError('')
    if (errors.username || errors.password) return

    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="rounded-card border border-line bg-card p-6 sm:p-8">
          <img
            src={logo}
            alt="Sairandhri Designer Boutique"
            className="mx-auto mb-6 h-auto w-full max-w-[260px]"
          />
          <h1 className="text-lg font-semibold text-ink">Welcome back</h1>
          <p className="mb-6 mt-0.5 text-muted">Log in to manage your boutique.</p>

          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Username"
              icon={IconUser}
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={fieldErrors.username}
            />
            <div className="relative">
              <Input
                label="Password"
                icon={IconLock}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                className="[&_input]:pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-[30px] rounded-control p-1.5 text-muted hover:text-ink"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>

            {error && (
              <p role="alert" className="rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
              Log in
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          © {YEAR} Sairandhri Designer Boutique
        </p>
      </div>
    </main>
  )
}
