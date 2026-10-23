// Pure helpers behind the chart tabs (tested in tests/charts.test.ts).
import type { Config, Design } from '../api/client'

const LENGTH_STEP = 0.1 // cm, the backend's fixed length step (robot/defaults.py)

/** The /workspace grid comes flat, row by row (meshgrid order: y rows, x columns).
 *  Returns the unique x and y values and z[row][col] for a Plotly heatmap. */
export function toGrid<T>(x: number[], y: number[], values: T[]): { xs: number[]; ys: number[]; z: T[][] } {
  const nx = x.findIndex((v, i) => i > 0 && v === x[0]) // x repeats after one row
  const cols = nx === -1 ? x.length : nx
  const rows = Math.round(values.length / cols)
  const xs = x.slice(0, cols)
  const ys = Array.from({ length: rows }, (_, r) => y[r * cols])
  const z = Array.from({ length: rows }, (_, r) => values.slice(r * cols, (r + 1) * cols))
  return { xs, ys, z }
}

/** Rule-of-thumb baseline (same as backend/validate.py): equal links whose total just reaches the
 *  farthest task corner (over all task areas), rounded up to the length step and kept within the link limits. */
export function baselineLength(config: Config): number {
  const far = Math.max(
    ...config.task_rects.flatMap(([x1, x2, y1, y2]) => [[x1, y1], [x2, y1], [x1, y2], [x2, y2]].map(([x, y]) => Math.hypot(x, y))),
  )
  const k = Math.ceil((far / 2 - config.link_min) / LENGTH_STEP - 1e-9)
  const b = Math.min(Math.max(config.link_min + k * LENGTH_STEP, config.link_min), config.link_max)
  return Number(b.toFixed(9))
}

/** Indices of the standout designs on the front (sorted by length, as the API returns it). */
export function highlights(front: Design[]): { label: string; index: number }[] {
  const pick = (better: (a: Design, b: Design) => boolean, ok: (d: Design) => boolean = () => true) => {
    let best = -1
    front.forEach((d, i) => {
      if (ok(d) && (best === -1 || better(d, front[best]))) best = i
    })
    return best
  }
  const list = [
    { label: 'Shortest arm', index: pick((a, b) => a.length < b.length) },
    { label: 'Shortest with ≥ 95% coverage', index: pick((a, b) => a.length < b.length, (d) => d.coverage >= 0.95) },
    { label: 'Best coverage', index: pick((a, b) => a.coverage > b.coverage || (a.coverage === b.coverage && a.length < b.length)) },
    { label: 'Most dexterous', index: pick((a, b) => a.dexterity > b.dexterity) },
  ]
  return list.filter((h) => h.index !== -1)
}
