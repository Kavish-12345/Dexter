import { useRef, useState, type PointerEvent } from 'react'
import type { Point } from '../lib/arm'
import { rectFromDrag } from '../lib/taskArea'

type Rect = [number, number, number, number]

interface Props {
  rect: Rect // x_min, x_max, y_min, y_max in cm
  reach: number // max total length (cm): the largest circle any design could reach
  step: number // grid spacing (cm): corners snap to it
  disabled: boolean
  onRect: (r: Rect) => void
}

// Top view of the table, i.e. the arm's plane (x right, y away from you, base at the origin).
// Drag to draw the task area.
export default function TaskAreaPicker({ rect, reach, step, disabled, onRect }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ a: Point; b: Point } | null>(null)
  const R = reach * 1.05

  // Mouse position -> cm in the robot frame (the drawing is flipped so y points up).
  function toWorld(e: PointerEvent): Point {
    const el = svg.current!
    const pt = el.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse())
    return { x: p.x, y: -p.y }
  }

  const shown = drag ? rectFromDrag(drag.a, drag.b, step) ?? rect : rect
  const [x1, x2, y1, y2] = shown

  return (
    <svg
      ref={svg}
      viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`}
      className={`h-36 w-full touch-none rounded-lg bg-slate-950 ring-1 ring-slate-800 ${disabled ? 'opacity-50' : 'cursor-crosshair'}`}
      onPointerDown={(e) => {
        if (disabled) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const p = toWorld(e)
        setDrag({ a: p, b: p })
      }}
      onPointerMove={(e) => drag && setDrag({ a: drag.a, b: toWorld(e) })}
      onPointerUp={() => {
        if (drag) {
          const r = rectFromDrag(drag.a, drag.b, step)
          if (r) onRect(r)
        }
        setDrag(null)
      }}
    >
      <g transform="scale(1,-1)">
        <line x1={-R} y1={0} x2={R} y2={0} stroke="#1e293b" vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={-R} x2={0} y2={R} stroke="#1e293b" vectorEffect="non-scaling-stroke" />
        <circle r={reach} fill="none" stroke="#334155" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="#0ea5e9" fillOpacity={0.25}
          stroke="#38bdf8" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <circle r={reach * 0.04} fill="#94a3b8" />
      </g>
    </svg>
  )
}
