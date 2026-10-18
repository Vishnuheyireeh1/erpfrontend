import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Props = {
  left: ReactNode
  right: ReactNode
  storageKey: string // remembers the width the user dragged to (per browser)
  defaultWidth?: number
  min?: number
  max?: number
  minLeft?: number // never squeeze the left side below this
}

const read = (key: string, fallback: number) => {
  try { return Number(localStorage.getItem(key)) || fallback } catch { return fallback }
}

// Two columns with a drag handle between them (laptop / desktop, 1280 px+). Drag to make the right
// side wider or narrower; double-click the handle to reset. Phones / tablets: stacked, no handle.
export function ResizableSplit({ left, right, storageKey, defaultWidth = 460, min = 340, max = 760, minLeft = 420 }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(() => read(storageKey, defaultWidth))
  const [dragging, setDragging] = useState(false)

  const clamp = (w: number) => {
    const total = box.current?.getBoundingClientRect().width ?? 1600
    return Math.round(Math.max(min, Math.min(max, total - minLeft, w)))
  }
  const save = (w: number) => { try { localStorage.setItem(storageKey, String(w)) } catch { /* private mode */ } }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !box.current) return
    setWidth(clamp(box.current.getBoundingClientRect().right - e.clientX - 8))
  }
  const onUp = () => {
    if (!dragging) return
    setDragging(false)
    save(width)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const w = clamp(width + (e.key === 'ArrowLeft' ? 30 : -30))
    setWidth(w)
    save(w)
  }
  const reset = () => { setWidth(clamp(defaultWidth)); save(defaultWidth) }

  return (
    <div
      ref={box}
      style={{ '--split-right': `${width}px` } as CSSProperties}
      className={cn('grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_16px_var(--split-right)] xl:gap-0', dragging && 'cursor-col-resize select-none')}
    >
      <div className="min-w-0">{left}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Drag to resize — double-click to reset"
        title="Drag to resize · double-click to reset"
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={reset}
        onKeyDown={onKey}
        className="group hidden cursor-col-resize touch-none justify-center outline-none xl:flex"
      >
        <span className={cn('my-2 w-1 rounded-full transition-colors group-hover:bg-brand/60 group-focus-visible:bg-brand', dragging ? 'bg-brand' : 'bg-line')} />
      </div>
      <div className="min-w-0">{right}</div>
    </div>
  )
}
