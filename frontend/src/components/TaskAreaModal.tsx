import { useEffect, useState } from 'react'
import { show, type Units } from '../lib/fields'
import TaskAreaPicker, { type Rect } from './TaskAreaPicker'

interface Props {
  rect: Rect
  reach: number // Max total (cm)
  step: number // grid spacing (cm)
  units: Units
  onApply: (r: Rect) => void
  onClose: () => void
}

// Large drawing board for the task area. Changes are kept as a draft until Apply.
export default function TaskAreaModal({ rect, reach, step, units, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<Rect>(rect)
  const len = (v: number) => show(v, 'length', units)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-stone-200" onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-stone-200 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Set task area</h2>
            <p className="text-xs text-stone-500">Drag on the board to draw the area the tool must reach. The dot is the robot's base.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-800" aria-label="Close">
            ✕
          </button>
        </header>

        <div className="px-5 pt-4">
          <div className="mx-auto aspect-square h-[min(56vh,460px)] overflow-hidden rounded-xl bg-stone-50 ring-1 ring-stone-200">
            <TaskAreaPicker rect={draft} reach={reach} step={step} units={units} mode="edit" onRect={setDraft} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-stone-700">
              x {len(draft[0])} to {len(draft[1])} · y {len(draft[2])} to {len(draft[3])} {units.length}
            </span>
            <span className="flex items-center gap-1.5 text-stone-500">
              <span className="h-3 w-3 rounded-sm bg-stone-500/20 ring-1 ring-stone-300" />
              Out of reach for every design (beyond Max total {len(reach)} {units.length})
            </span>
          </div>
        </div>

        <footer className="mt-4 flex justify-end gap-2 border-t border-stone-200 px-5 py-3">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50">
            Cancel
          </button>
          <button
            onClick={() => {
              onApply(draft)
              onClose()
            }}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600"
          >
            Apply
          </button>
        </footer>
      </div>
    </div>
  )
}
