import { IconPhotoPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { productImageUrl } from '../../constants'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp'

type Props = {
  savedPath: string | null // current photo on the server
  pending: File | null // chosen, uploaded on save
  removed: boolean // saved photo marked for removal
  error?: string
  onPick: (file: File | null, error?: string) => void
  onRemove: () => void
}

// Product photo — chosen here, uploaded when the product is saved.
export function ImageCard({ savedPath, pending, removed, error, onPick, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingUrl = useMemo(() => (pending ? URL.createObjectURL(pending) : null), [pending])
  useEffect(() => () => {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl)
  }, [pendingUrl])

  const url = pendingUrl ?? (removed ? null : productImageUrl(savedPath))

  const choose = (file: File | undefined) => {
    if (!file) return
    if (!ACCEPT.split(',').includes(file.type)) return onPick(null, 'Choose a JPG, PNG or WebP image')
    if (file.size > MAX_BYTES) return onPick(null, 'Image must be 2 MB or smaller')
    onPick(file)
  }

  return (
    <Card title="Photo">
      <div className="flex items-center gap-4 lg:flex-col lg:items-stretch">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square w-28 shrink-0 items-center justify-center overflow-hidden rounded-card border border-dashed border-line bg-page text-muted hover:border-brand hover:text-brand lg:w-full"
          aria-label="Choose photo"
        >
          {url ? <img src={url} alt="Product" className="size-full object-cover" /> : <IconPhotoPlus size={32} stroke={1.4} />}
        </button>
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            {url ? 'Change photo' : 'Add photo'}
          </Button>
          {url && (
            <Button size="sm" variant="ghost" icon={IconTrash} onClick={onRemove}>
              Remove
            </Button>
          )}
          <p className="text-xs text-muted">JPG, PNG or WebP, up to 2 MB.</p>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          choose(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </Card>
  )
}
