import { IconBarcode, IconMenu2, IconSearch } from '@tabler/icons-react'
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import swan from '@/assets/swan.png'
import { CameraScanModal } from '@/components/ui/CameraScanModal'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/useApiQuery'
import { useDebounce } from '@/lib/useDebounce'
import { hitsOf, type SearchData } from './searchHits'
import { SearchResults } from './SearchResults'
import { TodoBell } from './TodoBell'
import { UserMenu } from './UserMenu'

type Props = { onMenu: () => void }

type LookupResult = { item: { product: { id: number } } }

// Sticky top bar with ONE search box for the counter: type a phone, name, job / bill number or product —
// customers, stitching jobs, bills and products show together. It is also the barcode-scanner input:
// a scanner types the code + Enter → that product opens straight away.
export function Topbar({ onMenu }: Props) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')
  const [camera, setCamera] = useState(false)
  const term = useDebounce(query.trim(), 250)
  const results = useApiQuery(['top-search', term], () => (term.length >= 2 ? api.get<SearchData>(`/search?q=${encodeURIComponent(term)}`) : Promise.resolve(null)))
  const data = results.data ?? (term.length >= 2 ? results.lastData : null)
  const hits = data ? hitsOf(data) : []

  const go = (to: string) => {
    setQuery('')
    setOpen(false)
    setActive('')
    inputRef.current?.blur()
    navigate(to)
  }
  // Barcode / SKU → that product; anything else → the products list searched.
  const openCode = async (q: string) => {
    try {
      const { item } = await api.get<LookupResult>(`/products/lookup?code=${encodeURIComponent(q)}`)
      go(`/products/${item.product.id}`)
    } catch {
      go(`/products?search=${encodeURIComponent(q)}`)
    }
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    const hit = hits.find((h) => h.key === active)
    if (hit) return go(hit.to)
    if (hits.length === 1) return go(hits[0].to)
    void openCode(q)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); setActive(''); return }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    if (!hits.length) return
    const i = hits.findIndex((h) => h.key === active)
    const next = e.key === 'ArrowDown' ? (i + 1) % hits.length : (i <= 0 ? hits.length : i) - 1
    setActive(hits[next].key)
    setOpen(true)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-card px-4 md:px-6">
      <button type="button" onClick={onMenu} className="-ml-1 rounded-control p-1.5 text-ink-soft hover:bg-page md:hidden" aria-label="Open menu">
        <IconMenu2 size={22} />
      </button>
      <img src={swan} alt="Sairandhri" className="size-8 object-contain md:hidden" />

      <div className="relative min-w-0 flex-1 md:max-w-xl">
        <form role="search" onSubmit={onSubmit} className="flex h-10 items-center gap-2 rounded-control border border-line bg-page px-3 text-muted focus-within:border-brand">
          <IconSearch size={18} className="shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive('') }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKey}
            placeholder="Phone, name, job / bill no., product or scan…"
            aria-label="Search customers, jobs, bills and products"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
          />
          <button type="button" onClick={() => setCamera(true)} className="flex shrink-0 items-center gap-1 text-brand" title="Scan with the camera (a scanner gun works without clicking — just scan into the box)">
            <IconBarcode size={18} aria-hidden />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </form>
        {open && term.length >= 2 && (
          <div className="absolute inset-x-0 top-12 z-40 max-h-[70vh] overflow-y-auto rounded-card border border-line bg-card p-1 shadow-lg">
            {!data ? <p className="px-3 py-4 text-sm text-muted">Searching…</p> : <SearchResults data={data} active={active} onPick={go} />}
          </div>
        )}
      </div>
      {camera && <CameraScanModal onResult={(code) => { setCamera(false); void openCode(code) }} onClose={() => setCamera(false)} />}

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <TodoBell />
        <UserMenu />
      </div>
    </header>
  )
}
