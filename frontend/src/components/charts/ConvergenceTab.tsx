import type { Data, Layout } from 'plotly.js'
import { useMemo } from 'react'
import type { OptimizeResult } from '../../api/client'
import ChartCard from './ChartCard'
import Plot from './Plot'

// How the NSGA-II run progressed: best coverage in the population and how many designs met the
// coverage floor, generation by generation (the per-generation log from the optimizer).
export default function ConvergenceTab({ result }: { result: OptimizeResult }) {
  const log = result.log
  const traces = useMemo<Data[]>(
    () => [
      {
        type: 'scatter', mode: 'lines', name: 'best coverage (%)',
        x: log.map((g) => g.gen), y: log.map((g) => 100 * g.best_coverage),
        line: { color: '#f97316', width: 2.5, shape: 'spline' },
        hovertemplate: 'gen %{x}<br>best coverage %{y:.1f}%<extra></extra>',
      },
      {
        type: 'scatter', mode: 'lines', name: 'feasible designs', yaxis: 'y2',
        x: log.map((g) => g.gen), y: log.map((g) => g.n_feasible),
        line: { color: '#10b981', width: 2, dash: 'dot' },
        hovertemplate: 'gen %{x}<br>feasible %{y}<extra></extra>',
      },
    ],
    [log],
  )
  const layout = useMemo<Partial<Layout>>(
    () => ({
      legend: { orientation: 'h', x: 0, y: 1.08 },
      margin: { l: 64, r: 64, t: 32, b: 52 },
      xaxis: { title: { text: 'generation' } },
      yaxis: { title: { text: 'best coverage (%)' }, rangemode: 'tozero' },
      yaxis2: { title: { text: 'feasible designs in population' }, overlaying: 'y', side: 'right', rangemode: 'tozero', showgrid: false },
    }),
    [],
  )
  const first = log.findIndex((g) => g.n_feasible === log[log.length - 1].n_feasible)

  return (
    <ChartCard
      title="Convergence"
      note={
        <>
          {log.length - 1} generations, {result.evaluations} evaluations. The feasible count reached its final value ({log[log.length - 1].n_feasible})
          at generation {first}.
        </>
      }
    >
      <Plot data={traces} layout={layout} />
    </ChartCard>
  )
}
