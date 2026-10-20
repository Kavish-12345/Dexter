import type { Data, Layout, PlotDatum } from 'plotly.js'
import { useCallback, useMemo } from 'react'
import type { Design } from '../../api/client'
import { show, type Units } from '../../lib/fields'
import { fromCm } from '../../lib/units'
import ChartCard from './ChartCard'
import Plot from './Plot'

// The Pareto front: every design NSGA-II returned, as total length vs coverage, coloured by dexterity.
// Click a dot to select that design (the 3D view and the other tabs follow).
export default function ParetoTab({ front, selected, units, onSelect }: { front: Design[]; selected: number; units: Units; onSelect: (i: number) => void }) {
  const u = units.length
  const L = (v: number) => fromCm(v, u)

  const traces = useMemo<Data[]>(() => {
    const s = front[selected]
    return [
      {
        type: 'scatter', mode: 'markers',
        x: front.map((d) => L(d.length)), y: front.map((d) => 100 * d.coverage),
        customdata: front.map((d) => [show(d.l1, 'length', units), show(d.l2, 'length', units), d.dexterity.toFixed(3)]),
        marker: {
          size: 9, color: front.map((d) => d.dexterity), colorscale: [[0, '#fed7aa'], [0.5, '#f97316'], [1, '#7c2d12']],
          colorbar: { title: { text: 'dexterity' }, thickness: 12, outlinewidth: 0 }, line: { color: '#ffffff', width: 1 },
        },
        hovertemplate: `l1 %{customdata[0]} + l2 %{customdata[1]} ${u}<br>length %{x:.1f} ${u}<br>coverage %{y:.1f}%<br>dexterity %{customdata[2]}<extra></extra>`,
      },
      {
        type: 'scatter', mode: 'markers', x: [L(s.length)], y: [100 * s.coverage], hoverinfo: 'skip',
        marker: { size: 20, color: 'rgba(0,0,0,0)', line: { color: '#1c1917', width: 2 } },
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front, selected, units])

  const layout = useMemo<Partial<Layout>>(
    () => ({
      showlegend: false,
      hovermode: 'closest',
      xaxis: { title: { text: `total length l1 + l2 (${u}) · minimise` } },
      yaxis: { title: { text: 'coverage (%) · maximise' } },
    }),
    [u],
  )

  const onPointClick = useCallback((p: PlotDatum) => {
    if (p.curveNumber === 0 && typeof p.pointIndex === 'number') onSelect(p.pointIndex)
  }, [onSelect])

  return (
    <ChartCard
      title="Pareto front"
      note={<>{front.length} designs; none is better than another on all three objectives. Colour shows dexterity. Click a dot to select it (ringed).</>}
    >
      <Plot data={traces} layout={layout} onPointClick={onPointClick} />
    </ChartCard>
  )
}
