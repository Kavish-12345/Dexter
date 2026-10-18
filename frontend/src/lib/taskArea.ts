// Turning a mouse drag in the front view into a task rectangle snapped to the grid spacing.
import type { Point } from './arm'

/** Nearest multiple of step, without float noise (0.30000000000000004 -> 0.3). */
export function snap(v: number, step: number): number {
  return Number((Math.round(v / step) * step).toFixed(9))
}

/** Rectangle [x_min, x_max, y_min, y_max] spanned by two drag corners, snapped to the step.
 *  Null when the drag is too small to give a rectangle with area. */
export function rectFromDrag(a: Point, b: Point, step: number): [number, number, number, number] | null {
  const x1 = snap(Math.min(a.x, b.x), step)
  const x2 = snap(Math.max(a.x, b.x), step)
  const y1 = snap(Math.min(a.y, b.y), step)
  const y2 = snap(Math.max(a.y, b.y), step)
  return x2 > x1 && y2 > y1 ? [x1, x2, y1, y2] : null
}
