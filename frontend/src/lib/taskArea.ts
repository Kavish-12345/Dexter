// Task areas: turning a mouse drag into a rectangle snapped to the grid spacing, the overlap rule
// the backend uses, and the stops of the tour that visits every area.
import type { Rect, WorkspaceResult } from '../api/client'
import type { Point } from './arm'

export const MAX_AREAS = 4 // same cap as the backend (robot/defaults.py)
export const AREA_NAMES = ['A', 'B', 'C', 'D']
export const AREA_COLORS = ['#f97316', '#38bdf8', '#c084fc', '#facc15'] // orange, sky, violet, yellow

/** Nearest multiple of step, without float noise (0.30000000000000004 -> 0.3). */
export function snap(v: number, step: number): number {
  return Number((Math.round(v / step) * step).toFixed(9))
}

/** Rectangle [x_min, x_max, y_min, y_max] spanned by two drag corners, snapped to the step.
 *  Null when the drag is too small to give a rectangle with area. */
export function rectFromDrag(a: Point, b: Point, step: number): Rect | null {
  const x1 = snap(Math.min(a.x, b.x), step)
  const x2 = snap(Math.max(a.x, b.x), step)
  const y1 = snap(Math.min(a.y, b.y), step)
  const y2 = snap(Math.max(a.y, b.y), step)
  return x2 > x1 && y2 > y1 ? [x1, x2, y1, y2] : null
}

/** Two areas overlap or touch (same rule as the backend, so no task point is counted twice). */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a[0] <= b[1] && b[0] <= a[1] && a[2] <= b[3] && b[2] <= a[3]
}

/** Names of the first pair of areas that overlap, e.g. "A and C", or null if none do. */
export function overlapPair(rects: Rect[]): string | null {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (rectsOverlap(rects[i], rects[j])) return `${AREA_NAMES[i]} and ${AREA_NAMES[j]}`
    }
  }
  return null
}

/** One stop per task area for the tour: the covered task point closest to the area's centre.
 *  Areas with no covered point are skipped (the arm cannot get there). */
export function tourStops(task: WorkspaceResult['task'], rects: Rect[]): { area: number; x: number; y: number }[] {
  const stops: { area: number; x: number; y: number }[] = []
  rects.forEach(([x1, x2, y1, y2], k) => {
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    let best = -1
    task.x.forEach((x, i) => {
      if (task.area[i] !== k || !task.covered[i]) return
      if (best === -1 || Math.hypot(x - cx, task.y[i] - cy) < Math.hypot(task.x[best] - cx, task.y[best] - cy)) best = i
    })
    if (best !== -1) stops.push({ area: k, x: task.x[best], y: task.y[best] })
  })
  return stops
}
