import { useEffect, useRef, useState } from 'react'
import type { Design } from '../api/client'
import { show, type Units } from '../lib/fields'

interface Props {
  designs: Design[]
  selected: number
  units: Units
  disabled: boolean
  onSelect: (i: number) => void
}

const cols = 'grid grid-cols-[1.6fr_1.4fr_0.9fr_0.9fr] items-center gap-3'

// A styled dropdown for choosing a design from the front: a compact pill when closed, a table-like
// list when open (scrolled to the current design). Esc or a click outside closes it; arrow keys move.
export default function DesignSelect({ designs, selected, units, disabled, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const d = designs[selected]
  const len = (v: number) => show(v, 'length', units)

  // close on a click outside
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // keep the current design in view while the list is open
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${selected}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, selected])

  function onKey(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'Escape' || e.key === 'Enter') setOpen(false)
    else if (e.key === 'ArrowDown') onSelect(Math.min(designs.length - 1, selected + 1))
    else if (e.key === 'ArrowUp') onSelect(Math.max(0, selected - 1))
    else return
    e.preventDefault()
  }

  return (
    <div ref={root} className="relative" onKeyDown={onKey}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs ring-1 transition disabled:opacity-50 ${
          open ? 'ring-orange-400' : 'ring-stone-300 hover:ring-stone-400'
        }`}
      >
        <span className="font-mono text-stone-900">
          l1 {len(d.l1)} + l2 {len(d.l2)} {units.length}
        </span>
        <span className="text-stone-300">·</span>
        <span className="font-mono text-emerald-600">{(100 * d.coverage).toFixed(1)}%</span>
        <span className="text-stone-300">·</span>
        <span className="font-mono text-stone-600">dex {d.dexterity.toFixed(3)}</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 text-stone-400 transition ${open ? 'rotate-180' : ''}`} fill="currentColor">
          <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[440px] overflow-hidden rounded-xl bg-white shadow-2xl shadow-stone-900/15 ring-1 ring-stone-200">
          <div className={`${cols} border-b border-stone-200 bg-stone-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400`}>
            <span>Links ({units.length})</span>
            <span>Coverage</span>
            <span className="text-right">Dexterity</span>
            <span className="text-right">Length</span>
          </div>
          <div ref={list} role="listbox" className="max-h-80 overflow-y-auto py-1">
            {designs.map((x, i) => (
              <button
                key={i}
                data-i={i}
                role="option"
                aria-selected={i === selected}
                onClick={() => {
                  onSelect(i)
                  setOpen(false)
                }}
                className={`${cols} w-full px-4 py-1.5 text-left font-mono text-xs transition ${
                  i === selected ? 'bg-orange-50 text-orange-700' : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span>
                  {len(x.l1)} + {len(x.l2)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${100 * x.coverage}%` }} />
                  </span>
                  <span className="w-11 text-right">{(100 * x.coverage).toFixed(1)}%</span>
                </span>
                <span className="text-right">{x.dexterity.toFixed(3)}</span>
                <span className="text-right">{len(x.length)}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-stone-200 bg-stone-50 px-4 py-1.5 text-[10px] text-stone-400">
            {designs.length} designs · sorted by length · ↑ ↓ to move, Esc to close
          </div>
        </div>
      )}
    </div>
  )
}
