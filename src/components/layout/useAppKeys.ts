import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Keys on every page (laptop / desktop):
//   Alt+M        into the side menu (on the current page) — ↑ ↓ move, Enter opens, Esc back to where you were
//   Ctrl+K or /  the top search box (phone, name, job / bill no., product)
//   Alt+B        Billing (new bill)
const menuLinks = () => [...document.querySelectorAll<HTMLAnchorElement>('aside nav[aria-label="Main"] a')].filter((a) => a.offsetParent !== null)
const typing = (el: Element | null) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable)

export function useAppKeys() {
  const navigate = useNavigate()
  useEffect(() => {
    let back: HTMLElement | null = null // where the cursor was before Alt+M
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const inMenu = !!(document.activeElement as HTMLElement | null)?.closest('aside nav[aria-label="Main"]')
      if (e.altKey && !e.ctrlKey && k === 'm') {
        e.preventDefault()
        const links = menuLinks()
        const here = links.find((a) => a.getAttribute('aria-current') === 'page') ?? links[0]
        if (!inMenu) back = document.activeElement as HTMLElement | null
        here?.focus()
      } else if (e.altKey && !e.ctrlKey && k === 'b') {
        e.preventDefault()
        navigate('/billing')
      } else if (((e.ctrlKey || e.metaKey) && k === 'k') || (e.key === '/' && !typing(document.activeElement))) {
        e.preventDefault()
        const box = document.querySelector<HTMLInputElement>('header input[type="search"]')
        box?.focus()
        box?.select()
      } else if (inMenu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault()
        const links = menuLinks()
        const i = links.indexOf(document.activeElement as HTMLAnchorElement)
        links[Math.max(0, Math.min(links.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus()
      } else if (inMenu && e.key === 'Escape') {
        e.preventDefault()
        if (back && document.contains(back)) back.focus()
        else (document.activeElement as HTMLElement).blur()
        back = null
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [navigate])
}
