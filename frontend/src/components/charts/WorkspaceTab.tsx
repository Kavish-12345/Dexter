import type { Annotations, Data, Layout, Shape } from 'plotly.js'
import { useMemo } from 'react'
import type { Config, Design } from '../../api/client'
import { toGrid } from '../../lib/charts'
import { show, type Units } from '../../lib/fields'
import { AREA_COLORS, AREA_NAMES } from '../../lib/taskArea'
import { fromCm } from '../../lib/units'
import ChartCard, { Loading } from './ChartCard'
import Plot from './Plot'
import { useWorkspace } from './useWorkspace'

/** Task areas (one colour each) and the reach circle as Plotly shapes, in display units. */
export function overlayShapes(config: Config, reach: number, units: Units): Partial<Shape>[] {
  const L = (v: number) => fromCm(v, units.length)
  const R = L(reach)
  return [
    ...config.task_rects.map((r, k): Partial<Shape> => {
      const [x1, x2, y1, y2] = r.map(L)
      return { type: 'rect', x0: x1, x1: x2, y0: y1, y1: y2, line: { color: AREA_COLORS[k], width: 2 } }
    }),
    { type: 'circle', x0: -R, x1: R, y0: -R, y1: R, line: { color: '#a8a29e', width: 1, dash: 'dash' } },
  ]
}

/** Area names (A, B, ...) at each area's top-left corner, when there is more than one area. */
export function areaLabels(config: Config, units: Units): Partial<Annotations>[] {
  if (config.task_rects.length < 2) return []
  const L = (v: number) => fromCm(v, units.length)
  return config.task_rects.map(([x1, , , y2], k) => ({
    x: L(x1), y: L(y2), text: `<b>${AREA_NAMES[k]}</b>`, showarrow: false, xanchor: 'left', yanchor: 'bottom',
    font: { color: AREA_COLORS[k], size: 13 },
  }))
}

// Reachable workspace of the selected design: green where the tool can get to within the joint limits,
// with the task points marked covered (green) or missed (red).
export default function WorkspaceTab({ config, design, units }: { config: Config; design: Design; units: Units }) {
  const { data, error } = useWorkspace(config, design)
  const L = (v: number) => fromCm(v, units.length)
  const u = units.length

  const { traces, layout } = useMemo(() => {
    if (!data) return { traces: [] as Data[], layout: {} }
    const g = toGrid(data.x, data.y, data.covered.map((c) => (c ? 1 : 0)))
    const traces: Data[] = [
      {
        type: 'heatmap', x: g.xs.map(L), y: g.ys.map(L), z: g.z, zmin: 0, zmax: 1, showscale: false, hoverinfo: 'skip',
        colorscale: [[0, '#f5f5f4'], [1, '#bbf7d0']],
      },
      {
        type: 'scatter', mode: 'markers', x: data.task.x.map(L), y: data.task.y.map(L),
        marker: { size: 5, color: data.task.covered.map((c) => (c ? '#10b981' : '#f43f5e')) },
        hovertemplate: `(%{x}, %{y}) ${u}<extra></extra>`,
      },
      { type: 'scatter', mode: 'markers', x: [0], y: [0], marker: { size: 10, color: '#3f3f46' }, hovertemplate: 'base<extra></extra>' },
    ]
    const layout: Partial<Layout> = {
      showlegend: false,
      xaxis: { title: { text: `x (${u})` }, constrain: 'domain' },
      yaxis: { title: { text: `y (${u})` }, scaleanchor: 'x', constrain: 'domain' },
      shapes: overlayShapes(config, design.l1 + design.l2, units),
      annotations: areaLabels(config, units),
    }
    return { traces, layout }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, units, config, design])

  const covered = data ? data.task.covered.filter(Boolean).length : 0
  const total = data?.task.covered.length ?? 0

  return (
    <ChartCard
      title="Reachable workspace"
      note={
        data ? (
          <>
            Green: where the tool can reach within the joint limits.{' '}
            {data.task.area_coverage.length > 1
              ? `Coverage ${(100 * design.coverage).toFixed(1)}%, the mean of the areas: ` +
                data.task.area_coverage.map((c, k) => `${AREA_NAMES[k]} ${(100 * c).toFixed(1)}%`).join(', ') +
                ` (${covered} of ${total} task points)`
              : `${covered} of ${total} task points covered (${((100 * covered) / Math.max(total, 1)).toFixed(1)}%)`}
            . Dashed circle: reach l1 + l2 = {show(design.l1 + design.l2, 'length', units)} {u}.
          </>
        ) : (
          'Loading the workspace of this design…'
        )
      }
    >
      {data ? <Plot data={traces} layout={layout} /> : <Loading error={error} />}
    </ChartCard>
  )
}
