import { cn } from '@/lib/cn'

// Base control styles — red border only on error.
export function controlClass(error?: string) {
  return cn(
    'w-full rounded-control border bg-card px-3 text-sm text-ink outline-none transition-colors',
    'placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand-tint',
    'disabled:cursor-not-allowed disabled:bg-page disabled:text-muted',
    error ? 'border-danger' : 'border-line',
  )
}
