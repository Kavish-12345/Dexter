import { useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Rect } from '../api/client'
import type { Point } from '../lib/arm'
import { show, type Units } from '../lib/fields'
import { AREA_COLORS, AREA_NAMES, rectFromDrag, rectsOverlap } from '../lib/taskArea'

export type { Rect }

interface Props {
  rects: Rect[] // task areas A, B, ...: x_min, x_max, y_min, y_max in cm
  active?: number // edit mode: the selected area (rects.length: a new area, drawn by the next drag)
  reach: number // Max total (cm): the longest allowed arm
  step: number // grid spacing (cm): corners snap to it
  units: Units
  mode: 'preview' | 'edit' // small read-only preview in the panel, or the drawing board in the modal
  onChange?: (rects: Rect[], active: number) => void // edit mode: new areas and selection
  onNext?: () => void // edit mode: shows a "✓ Next" tick above the selected area
}

/** A round grid/label step (cm) for a view of this size. */
function niceStep(reach: number): number {
  return reach <= 40 ? 5 : reach <= 120 ? 10 : reach <= 300 ? 25 : 50
}

// Top view of the table, i.e. the arm's plane (x right, y away from you, base at the origin).
// Edit mode: drag anywhere on the board to draw the selected area (it replaces that area's old
// rectangle). Corners snap to the grid step and stay on the board; the area beyond Max total is
// shaded because no allowed design can reach it.
export default function TaskAreaPicker({ rects, active = 0, reach, step, units, mode, onChange, onNext }: Props) {
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

  // The areas as they look right now, with the drag applied.
  const shown: Rect[] = [...rects]
  const drawing = drag ? rectFromDrag(drag.a, drag.b, step) : null
  if (drawing) shown[active] = drawing
  const clashes = new Set<number>() // areas overlapping another one: outlined red
  for (let i = 0; i < shown.length; i++) {
    for (let j = i + 1; j < shown.length; j++) {
      if (rectsOverlap(shown[i], shown[j])) {
        clashes.add(i)
        clashes.add(j)
      }
    }
  }

  const label = (v: number) => show(v, 'length', units)
  const font = R * 0.035

  function finish() {
    if (drawing) onChange?.(shown, active)
    setDrag(null)
  }

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
      onPointerUp={finish}
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
        {shown.map(([x1, x2, y1, y2], k) => {
          const on = edit && k === active
          const clash = edit && clashes.has(k)
          return (
            <rect key={k} x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill={AREA_COLORS[k]}
              fillOpacity={!edit ? 0.2 : on ? 0.28 : 0.12}
              stroke={clash ? '#e11d48' : AREA_COLORS[k]} strokeDasharray={clash ? '6 4' : undefined}
              strokeWidth={!edit ? 1.5 : on ? 3 : 1.5} vectorEffect="non-scaling-stroke" />
          )
        })}
        <circle r={reach * (edit ? 0.02 : 0.04)} fill="#3f3f46" />
      </g>

      {/* area names, at each area's top-left corner */}
      {(shown.length > 1 || edit) &&
        shown.map(([x1, , , y2], k) => (
          <text key={k} x={x1 + font * 0.3} y={-y2 + font * (edit ? 1.15 : 2.2)} fontSize={font * (edit ? 1.1 : 2)}
            fontWeight={700} fill={AREA_COLORS[k]} className="pointer-events-none">
            {AREA_NAMES[k]}
          </text>
        ))}

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

      {/* tick just above the area being drawn: done with it, go on to the next area */}
      {edit && onNext && !drag && active < rects.length && (() => {
        const [, x2, , y2] = rects[active]
        const h = font * 2.1
        const w = font * 5.6
        const above = -y2 - h - font * 0.4
        const top = above < -R ? -y2 + font * 0.4 : above // no room above: just inside the top edge
        const left = Math.max(-R, Math.min(R - w, x2 - w))
        return (
          <g
            className="cursor-pointer"
            onPointerDown={(e) => e.stopPropagation()} // a click here must not start a new drawing
            onClick={onNext}
          >
            <title>Done with this area: draw the next one</title>
            <rect x={left} y={top} width={w} height={h} rx={h / 2} fill="#1c1917" />
            <text x={left + w / 2} y={top + h * 0.68} textAnchor="middle" fontSize={font * 1.15} fontWeight={700} fill="#fff">
              ✓ Next
            </text>
          </g>
        )
      })()}
    </svg>
  )
}
