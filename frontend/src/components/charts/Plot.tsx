import type { Config as PlotConfig, Data, Layout, PlotDatum } from 'plotly.js'
import Plotly from 'plotly.js-dist-min'
import { useEffect, useRef } from 'react'

// Shared look for every chart: Inter font, stone greys, white plot area, thin grid.
const BASE: Partial<Layout> = {
  font: { family: 'Inter, ui-sans-serif, system-ui, sans-serif', size: 12, color: '#57534e' },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: '#ffffff',
  margin: { l: 64, r: 24, t: 16, b: 52 },
  hoverlabel: { font: { family: 'JetBrains Mono, monospace', size: 11 } },
  xaxis: { gridcolor: '#e7e5e4', zerolinecolor: '#a8a29e', linecolor: '#d6d3d1' },
  yaxis: { gridcolor: '#e7e5e4', zerolinecolor: '#a8a29e', linecolor: '#d6d3d1' },
}
const CONFIG: Partial<PlotConfig> = { displaylogo: false, responsive: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'] }

interface Props {
  data: Data[]
  layout?: Partial<Layout>
  onPointClick?: (point: PlotDatum) => void
}

// A small wrapper around plotly.js: draws (or updates) the chart when data or layout change, follows
// the size of its container, and passes point clicks back. Fills its parent.
export default function Plot({ data, layout = {}, onPointClick }: Props) {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = el.current
    if (!node) return
    const merged: Partial<Layout> = {
      ...BASE,
      ...layout,
      xaxis: { ...BASE.xaxis, ...layout.xaxis },
      yaxis: { ...BASE.yaxis, ...layout.yaxis },
    }
    Plotly.react(node, data, merged, CONFIG).then((gd) => {
      ;(gd as unknown as { removeAllListeners: (e: string) => void }).removeAllListeners('plotly_click')
      if (onPointClick) gd.on('plotly_click', (e) => e.points[0] && onPointClick(e.points[0]))
    })
  }, [data, layout, onPointClick])

  // follow the container size (e.g. when the settings panel collapses)
  useEffect(() => {
    const node = el.current
    if (!node) return
    const observer = new ResizeObserver(() => Plotly.Plots.resize(node))
    observer.observe(node)
    return () => {
      observer.disconnect()
      Plotly.purge(node)
    }
  }, [])

  return <div ref={el} className="h-full w-full" />
}
