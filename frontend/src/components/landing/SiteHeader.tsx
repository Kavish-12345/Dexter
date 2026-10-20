import { useLayoutEffect, useRef, useState } from 'react'
import Logo from '../Logo'

export type SitePage = 'landing' | 'how' | 'math'

const LINKS: { page: SitePage; label: string }[] = [
  { page: 'landing', label: 'Home' },
  { page: 'how', label: 'How it works' },
  { page: 'math', label: 'The math' },
]

// Top bar of the public pages: logo (home) on the left; bold uppercase links on the right, in the
// same style as the app's tabs, with an orange underline that slides to the current page.
// It stays mounted while the page below changes, so the underline can glide between links.
export default function SiteHeader({ page, onNavigate }: { page: SitePage; onNavigate: (p: SitePage) => void }) {
  const refs = useRef<Partial<Record<SitePage, HTMLButtonElement | null>>>({})
  const [bar, setBar] = useState({ left: 0, width: 0 })

  // Measure the current link and move the underline under it. Only updates state when the position
  // really changed, and only runs when the page changes, the web font loads or the window resizes
  // (running after every render would loop forever and freeze the page).
  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[page]
      if (!el) return
      setBar((b) => (b.left === el.offsetLeft && b.width === el.offsetWidth ? b : { left: el.offsetLeft, width: el.offsetWidth }))
    }
    measure()
    let alive = true
    document.fonts?.ready.then(() => alive && measure()) // widths change once the web font has loaded
    window.addEventListener('resize', measure)
    return () => {
      alive = false
      window.removeEventListener('resize', measure)
    }
  }, [page])

  return (
    <header className="relative z-20 shrink-0 border-b border-stone-200/70 bg-stone-50/80 backdrop-blur">
      <div className="mx-auto flex max-w-[88rem] items-center justify-between px-8 py-3">
        <button onClick={() => onNavigate('landing')} className="flex items-end gap-1.5 text-2xl font-extrabold leading-none tracking-tight text-stone-900">
          <Logo size={40} />
          <span className="pb-0.5">Dexter</span>
        </button>

        <nav className="relative flex items-center gap-8">
          {LINKS.map((l) => (
            <button
              key={l.page}
              ref={(el) => {
                refs.current[l.page] = el
              }}
              onClick={() => onNavigate(l.page)}
              aria-current={page === l.page ? 'page' : undefined}
              className={`py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                page === l.page ? 'text-stone-900' : 'text-stone-400 hover:text-stone-900'
              }`}
            >
              {l.label}
            </button>
          ))}
          <span
            className="absolute bottom-0 h-0.5 rounded-full bg-orange-500 transition-[left,width] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]"
            style={{ left: bar.left, width: bar.width }}
          />
        </nav>
      </div>
    </header>
  )
}
