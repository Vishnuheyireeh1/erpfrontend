import { IconPhoto } from '@tabler/icons-react'
import { cn } from '@/lib/cn'
import { productImageUrl } from '../constants'

// Square product photo, or a placeholder icon when there's no photo.
export function ProductThumb({ imagePath, size = 40 }: { imagePath: string | null; size?: number }) {
  const url = productImageUrl(imagePath)
  const box = cn('shrink-0 overflow-hidden rounded-control border border-line bg-page')
  if (!url) {
    return (
      <span className={cn(box, 'flex items-center justify-center text-muted')} style={{ width: size, height: size }}>
        <IconPhoto size={size * 0.45} stroke={1.5} aria-hidden />
      </span>
    )
  }
  return <img src={url} alt="" loading="lazy" className={cn(box, 'object-cover')} style={{ width: size, height: size }} />
}
