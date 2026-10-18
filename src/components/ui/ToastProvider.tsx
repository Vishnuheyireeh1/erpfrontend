import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconX } from '@tabler/icons-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ToastContext, type ToastApi, type ToastTone } from './toast-context'

type Toast = { id: number; message: string; tone: ToastTone }

const DURATION_MS = 3500

const toneStyle: Record<ToastTone, { icon: typeof IconInfoCircle; className: string }> = {
  success: { icon: IconCircleCheck, className: 'text-success' },
  error: { icon: IconAlertTriangle, className: 'text-danger' },
  info: { icon: IconInfoCircle, className: 'text-info' },
}

// Wrap the app once; toasts stack above the phone bottom bar / top-right on desktop.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-3), { id, message, tone }])
      window.setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-auto md:left-auto md:right-6 md:top-20 md:items-end"
      >
        {toasts.map((toast) => {
          const { icon: Icon, className } = toneStyle[toast.tone]
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-card px-4 py-3 shadow-lg"
            >
              <Icon size={20} className={cn('mt-0.5 shrink-0', className)} aria-hidden />
              <p className="flex-1 text-ink">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-muted hover:text-ink"
                aria-label="Dismiss"
              >
                <IconX size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
