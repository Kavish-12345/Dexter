import { useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Point } from '../lib/arm'
import { show, type Units } from '../lib/fields'
import { rectFromDrag } from '../lib/taskArea'

export type Rect = [number, number, number, number]

interface Props {
  rect: Rect // x_min, x_max, y_min, y_max in cm
  reach: number // Max total (cm): the longest allowed arm
  step: number // grid spacing (cm): corners snap to it
  units: Units
  mode: 'preview' | 'edit' // small read-only preview in the panel, or the drawing board in the modal
  onRect?: (r: Rect) => void
}

/** A round grid/label step (cm) for a view of this size. */
function niceStep(reach: number): number {
  return reach <= 40 ? 5 : reach <= 120 ? 10 : reach <= 300 ? 25 : 50
}

// Top view of the table, i.e. the arm's plane (x right, y away from you, base at the origin).
// In edit mode: drag to draw the task area (clamped to the board); the area beyond Max total is
// shaded because no allowed design can reach it.
export default function TaskAreaPicker({ rect, reach, step, units, mode, onRect }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ a: Point; b: Point } | null>(null)
  const edit = mode === 'edit'
  const R = reach * (edit ? 1.12 : 1.05) // half-size of the square view (cm)
  const far = edit ? R : 2.5 * R // the panel box is wider than the square view: draw the grid out to here
  const tick = niceStep(reach)
  const grid = tick / 2

  const lines = useMemo(() => {
    const n = Math.ceil(far / grid)
    return Array.from({ length: 2 * n + 1 }, (_, i) => (i - n) * grid)
  }, [far, grid])
  const ticks = useMemo(() => {
    const n = Math.floor(reach / tick)
    return Array.from({ length: 2 * n + 1 }, (_, i) => (i - n) * tick).filter((v) => v !== 0)
  }, [reach, tick])

  // Mouse position -> cm in the robot frame (drawing flipped so y points up), kept on the board.
  function toWorld(e: PointerEvent): Point {
    const el = svg.current!
    const pt = el.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse())
    const clamp = (v: number) => Math.min(R, Math.max(-R, v))
    return { x: clamp(p.x), y: clamp(-p.y) }
  }

  const shown = drag ? rectFromDrag(drag.a, drag.b, step) ?? rect : rect
  const [x1, x2, y1, y2] = shown
  const label = (v: number) => show(v, 'length', units)
  const font = R * 0.035

  return (
    <svg
      ref={svg}
      viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`}
      className={`h-full w-full touch-none select-none ${edit ? 'cursor-crosshair' : ''}`}
      onPointerDown={(e) => {
        if (!edit) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const p = toWorld(e)
        setDrag({ a: p, b: p })
      }}
      onPointerMove={(e) => drag && setDrag({ a: drag.a, b: toWorld(e) })}
      onPointerUp={() => {
        if (drag) {
          const r = rectFromDrag(drag.a, drag.b, step)
          if (r) onRect?.(r)
        }
        setDrag(null)
      }}
    >
      {edit && (
        <defs>
          <mask id="dexter-reach-mask">
            <rect x={-far} y={-far} width={2 * far} height={2 * far} fill="white" />
            <circle r={reach} fill="black" />
          </mask>
        </defs>
      )}

      <g transform="scale(1,-1)">
        {/* the table seen from above */}
        {lines.map((v) => (
          <g key={v}>
            <line x1={v} y1={-far} x2={v} y2={far} stroke="#e7e5e4" vectorEffect="non-scaling-stroke" />
            <line x1={-far} y1={v} x2={far} y2={v} stroke="#e7e5e4" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        {/* out of reach for every allowed design (beyond Max total) */}
        {edit && <rect x={-far} y={-far} width={2 * far} height={2 * far} fill="#78716c" fillOpacity={0.14} mask="url(#dexter-reach-mask)" />}
        <line x1={-far} y1={0} x2={far} y2={0} stroke="#a8a29e" vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-far} x2={0} y2={far} stroke="#a8a29e" vectorEffect="non-scaling-stroke" />
        <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="#f97316" fillOpacity={0.18}
          stroke="#f97316" strokeWidth={edit ? 2 : 1.5} vectorEffect="non-scaling-stroke" />
        <circle r={reach * (edit ? 0.02 : 0.04)} fill="#3f3f46" />
      </g>

      {/* axis labels (outside the flipped group so the text is not mirrored) */}
      {edit &&
        ticks.map((v) => (
          <g key={v} fill="#78716c" fontSize={font} className="pointer-events-none">
            <text x={v} y={font * 1.3} textAnchor="middle">{label(v)}</text>
            <text x={-font * 0.4} y={-v + font * 0.35} textAnchor="end">{label(v)}</text>
          </g>
        ))}
      {edit && (
        <g fill="#57534e" fontSize={font * 1.1} fontWeight={600} className="pointer-events-none">
          <text x={R * 0.95} y={-font * 0.6} textAnchor="end">x</text>
          <text x={font * 0.6} y={-R * 0.92}>y</text>
        </g>
      )}
    </svg>
  )
}
