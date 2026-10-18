import { IconAlertTriangle } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tone = 'neutral' | 'brand' | 'success' | 'pending' | 'warn' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-page text-ink-soft border border-line',
  brand: 'bg-brand-tint text-brand',
  success: 'bg-success-tint text-success',
  pending: 'bg-pending-tint text-pending',
  warn: 'bg-warn-tint text-warn',
  danger: 'bg-danger-tint text-danger',
  info: 'bg-info-tint text-info',
}

// Status pill. "warn" always shows an icon so it never reads as brand red.
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
      )}
    >
      {(tone === 'warn' || tone === 'danger') && <IconAlertTriangle size={13} aria-hidden />}
      {children}
    </span>
  )
}
