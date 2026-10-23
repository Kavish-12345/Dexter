import type { Data, Layout } from 'plotly.js'
import { useMemo } from 'react'
import type { Config, Design } from '../../api/client'
import { toGrid } from '../../lib/charts'
import type { Units } from '../../lib/fields'
import { fromCm } from '../../lib/units'
import ChartCard, { Loading } from './ChartCard'
import Plot from './Plot'
import { useWorkspace } from './useWorkspace'
import { areaLabels, overlayShapes } from './WorkspaceTab'

// Dexterity map of the selected design: |det J| / (l1 l2) = |s2| at every reachable point.
// Dark orange: far from a singularity (theta2 near +-90 deg); pale: close to one (arm straight or folded).
export default function DexterityTab({ config, design, units }: { config: Config; design: Design; units: Units }) {
  const { data, error } = useWorkspace(config, design)
  const L = (v: number) => fromCm(v, units.length)
  const u = units.length

  const { traces, layout } = useMemo(() => {
    if (!data) return { traces: [] as Data[], layout: {} }
    const g = toGrid(data.x, data.y, data.dexterity)
    const traces: Data[] = [
      {
        type: 'heatmap', x: g.xs.map(L), y: g.ys.map(L), z: g.z as (number | null)[][], zmin: 0, zmax: 1,
        colorscale: [[0, '#fff7ed'], [0.5, '#fb923c'], [1, '#7c2d12']],
        colorbar: { title: { text: '|s2|' }, thickness: 12, outlinewidth: 0 },
        hovertemplate: `(%{x:.1f}, %{y:.1f}) ${u}<br>dexterity %{z:.3f}<extra></extra>`,
      },
      {
        type: 'scatter', mode: 'markers', x: data.task.x.map(L), y: data.task.y.map(L),
        marker: { size: 3, color: 'rgba(28,25,23,0.35)' }, hoverinfo: 'skip',
      },
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

  return (
    <ChartCard
      title="Dexterity map"
      note={
        <>
          |det J| / (l1·l2) = |sin θ2| at each reachable point: dark = far from a singularity, pale = near one (arm straight
          or folded). Mean over the covered task points: <b className="font-mono text-stone-700">{design.dexterity.toFixed(3)}</b>.
        </>
      }
    >
      {data ? <Plot data={traces} layout={layout} /> : <Loading error={error} />}
    </ChartCard>
  )
}
