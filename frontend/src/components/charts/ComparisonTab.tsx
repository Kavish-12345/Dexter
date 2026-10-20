import { useEffect, useMemo, useState } from 'react'
import { ApiError, evaluateDesign, type Config, type Design } from '../../api/client'
import { baselineLength, highlights } from '../../lib/charts'
import { show, type Units } from '../../lib/fields'
import ChartCard from './ChartCard'

type Row = { label: string; d: Design; tag?: string; index?: number }

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-100">
      <span className={`block h-full rounded-full ${color}`} style={{ width: `${(100 * value) / Math.max(max, 1e-9)}%` }} />
    </span>
  )
}

// The rule-of-thumb baseline next to the selected design and the standout designs of the front.
export default function ComparisonTab(props: { config: Config; front: Design[]; selected: number; units: Units; onSelect: (i: number) => void }) {
  const { config, front, selected, units, onSelect } = props
  const [baseline, setBaseline] = useState<Design | null>(null)
  const [error, setError] = useState('')
  const b = baselineLength(config)

  useEffect(() => {
    evaluateDesign(config, b, b)
      .then((s) => setBaseline({ l1: b, l2: b, ...s }))
      .catch((e) => setError(e instanceof ApiError ? e.messages.join('; ') : String(e)))
  }, [config, b])

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = []
    if (baseline) list.push({ label: 'Baseline (equal links)', d: baseline, tag: 'rule of thumb' })
    list.push({ label: 'Selected design', d: front[selected], tag: 'selected', index: selected })
    for (const h of highlights(front)) list.push({ label: h.label, d: front[h.index], index: h.index })
    return list
  }, [baseline, front, selected])

  const maxLen = Math.max(...rows.map((r) => r.d.length))
  const len = (v: number) => show(v, 'length', units)
  const u = units.length

  return (
    <ChartCard
      title="Design comparison"
      note={
        <>
          Baseline: equal links whose total just reaches the farthest task corner ({len(b)} + {len(b)} {u}). Click a row from the front to select it.
          {error && <span className="ml-1 text-rose-600">{error}</span>}
        </>
      }
    >
      <div className="h-full overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wider text-stone-400">
            <tr className="border-b border-stone-200">
              <th className="px-4 py-2.5 font-semibold">Design</th>
              <th className="px-4 py-2.5 font-semibold">Links ({u})</th>
              <th className="px-4 py-2.5 font-semibold">Coverage</th>
              <th className="px-4 py-2.5 font-semibold">Dexterity</th>
              <th className="px-4 py-2.5 font-semibold">Length ({u})</th>
              <th className="px-4 py-2.5 font-semibold">Feasible</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.label}
                onClick={() => r.index !== undefined && onSelect(r.index)}
                className={`border-b border-stone-100 ${r.index !== undefined ? 'cursor-pointer hover:bg-stone-50' : ''} ${
                  r.tag === 'selected' ? 'bg-orange-50/70' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-stone-900">{r.label}</div>
                  {r.tag && <div className="text-[11px] text-stone-400">{r.tag}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-stone-700">
                  {len(r.d.l1)} + {len(r.d.l2)}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-mono text-stone-700">
                    <Bar value={r.d.coverage} max={1} color="bg-emerald-500" />
                    {(100 * r.d.coverage).toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-mono text-stone-700">
                    <Bar value={r.d.dexterity} max={1} color="bg-orange-500" />
                    {r.d.dexterity.toFixed(3)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-mono text-stone-700">
                    <Bar value={r.d.length} max={maxLen} color="bg-stone-400" />
                    {len(r.d.length)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.d.feasible ? <span className="text-emerald-600">yes</span> : <span className="text-rose-600">no</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}
