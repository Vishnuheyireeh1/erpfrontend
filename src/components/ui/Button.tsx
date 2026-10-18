import { IconLoader2, type Icon } from '@tabler/icons-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: Icon
  loading?: boolean
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover',
  secondary: 'border border-line bg-card text-ink hover:bg-page',
  ghost: 'text-ink-soft hover:bg-page hover:text-ink',
  danger: 'border border-danger/30 bg-danger-tint text-danger hover:bg-danger hover:text-white',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

// Only one "primary" button per screen area; everything else is secondary/ghost.
export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <IconLoader2 size={18} className="animate-spin" aria-hidden />
      ) : (
        Icon && <Icon size={18} stroke={1.8} aria-hidden />
      )}
      {children}
    </button>
  )
}
