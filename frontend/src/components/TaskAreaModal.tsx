import { useEffect, useState } from 'react'
import type { Rect } from '../api/client'
import { show, type Units } from '../lib/fields'
import { AREA_COLORS, AREA_NAMES, MAX_AREAS, overlapPair } from '../lib/taskArea'
import TaskAreaPicker from './TaskAreaPicker'

interface Props {
  rects: Rect[]
  reach: number // Max total (cm)
  step: number // grid spacing (cm)
  units: Units
  onApply: (r: Rect[]) => void
  onClose: () => void
}

const kbd = 'rounded border border-stone-300 bg-white px-1 font-mono text-[10px] text-stone-600'

// Large drawing board for the task areas (1 to 4). Draw, select, move and remove right on the board;
// the list on the right shows every area with its size. Changes are a draft until Apply.
export default function TaskAreaModal({ rects, reach, step, units, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<Rect[]>(rects)
  const [active, setActive] = useState(0)
  const len = (v: number) => show(v, 'length', units)
  const overlap = overlapPair(draft)

  function remove(k: number) {
    if (k >= draft.length || draft.length < 2) return
    setDraft((d) => d.filter((_, j) => j !== k))
    setActive((a) => Math.max(0, a >= k ? a - 1 : a))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Delete' || e.key === 'Backspace') remove(active)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-stone-200" onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-stone-200 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Task areas</h2>
            <p className="text-xs text-stone-500">Where the tool must work. Up to {MAX_AREAS} areas, anywhere around the base (the dot).</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-800" aria-label="Close">
            ✕
          </button>
        </header>

        <div className="flex flex-col gap-4 px-5 pt-4 md:flex-row">
          {/* the board */}
          <div className="aspect-square w-full shrink-0 overflow-hidden rounded-xl bg-stone-50 ring-1 ring-stone-200 md:h-[min(58vh,440px)] md:w-auto">
            <TaskAreaPicker rects={draft} active={active} reach={reach} step={step} units={units} mode="edit"
              onChange={(r, a) => {
                setDraft(r)
                setActive(a)
              }}
              // the tick above the area: done with it, the next drag draws a new area
              onNext={draft.length < MAX_AREAS ? () => setActive(draft.length) : undefined} />
          </div>

          {/* areas list and help */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 text-xs">
            <ul className="space-y-1.5">
              {draft.map((r, k) => (
                <li key={k}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setActive(k)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ring-1 transition ${
                      k === active ? 'bg-stone-50 ring-stone-400' : 'ring-stone-200 hover:ring-stone-300'
                    }`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: AREA_COLORS[k] }} />
                    <span className="font-bold text-stone-900">{AREA_NAMES[k]}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-stone-500">
                      x {len(r[0])}…{len(r[1])} · y {len(r[2])}…{len(r[3])}
                    </span>
                    {draft.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          remove(k)
                        }}
                        title={`Remove area ${AREA_NAMES[k]}`}
                        className="rounded p-0.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {active === draft.length && (
                <li className="flex items-center gap-2 rounded-lg bg-orange-50 px-2.5 py-2 text-orange-700 ring-1 ring-orange-300">
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: AREA_COLORS[draft.length] }} />
                  <span className="flex-1">
                    <b>Area {AREA_NAMES[draft.length]}</b>: drag on the board to draw it
                  </span>
                  <button onClick={() => setActive(0)} className="rounded p-0.5 text-orange-400 hover:text-orange-700" title="Cancel">
                    ✕
                  </button>
                </li>
              )}
            </ul>

            <div className="mt-auto space-y-1.5 rounded-lg bg-stone-50 p-2.5 text-[11px] leading-relaxed text-stone-500 ring-1 ring-stone-100">
              <p><b className="text-stone-700">Draw:</b> drag on the board: it draws the highlighted area</p>
              <p><b className="text-stone-700">Next area:</b> press ✓ Next above the area · <b className="text-stone-700">Change one:</b> click it in the list, drag again</p>
              <p>
                <b className="text-stone-700">Remove:</b> <span className={kbd}>Del</span> or ✕ · <span className={kbd}>Esc</span> closes
              </p>
              <p className="flex items-center gap-1.5 pt-0.5">
                <span className="h-3 w-3 shrink-0 rounded-sm bg-stone-500/20 ring-1 ring-stone-300" />
                Shaded: beyond Max total ({len(reach)} {units.length}), no design reaches it
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-4 flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-3">
          {overlap && <p className="mr-auto text-xs font-medium text-rose-600">Areas {overlap} overlap or touch: move one apart.</p>}
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
            Cancel
          </button>
          <button
            disabled={overlap !== null}
            onClick={() => {
              onApply(draft)
              onClose()
            }}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-40"
          >
            Apply {draft.length > 1 ? `${draft.length} areas` : ''}
          </button>
        </footer>
      </div>
    </div>
  )
}
