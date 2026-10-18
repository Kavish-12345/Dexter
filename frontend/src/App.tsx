import { useEffect, useState } from 'react'
import { ApiError, getDefaults, optimize, type Config, type Design, type OptimizeResult } from './api/client'
import ArmScene from './components/arm/ArmScene'
import TaskSetup from './components/TaskSetup'
import { defaultDesign } from './lib/arm'
import { show, type Units } from './lib/fields'

function messagesOf(e: unknown): string[] {
  return e instanceof ApiError ? e.messages : [String(e)]
}

// A finished optimization together with the exact config it was computed with,
// so later views (/ik, /workspace, the arm) use the same config as the results.
interface Run {
  config: Config
  result: OptimizeResult
}

const TABS = ['3D Arm', 'Workspace', 'Dexterity', 'Pareto', 'Convergence', 'Comparison'] as const
type Tab = (typeof TABS)[number]
const READY: Tab[] = ['3D Arm'] // the other tabs arrive in steps 8d and 8e

function designLabel(d: Design, units: Units): string {
  const l1 = show(d.l1, 'length', units)
  const l2 = show(d.l2, 'length', units)
  return `l1 ${l1} + l2 ${l2} ${units.length} · ${(100 * d.coverage).toFixed(1)}% · dex ${d.dexterity.toFixed(3)}`
}

export default function App() {
  const [defaults, setDefaults] = useState<Config | null>(null)
  const [config, setConfig] = useState<Config | null>(null) // canonical: cm, rad, fraction
  const [units, setUnits] = useState<Units>({ length: 'cm', angle: 'deg' })
  const [version, setVersion] = useState(0) // bumped on reset so the form re-derives its fields
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [run, setRun] = useState<Run | null>(null)
  const [selected, setSelected] = useState(0) // index into run.result.front
  const [panelOpen, setPanelOpen] = useState(true)
  const [tab, setTab] = useState<Tab>('3D Arm')

  useEffect(() => {
    getDefaults()
      .then((d) => {
        setDefaults(d)
        setConfig(d)
      })
      .catch((e) => setErrors(messagesOf(e)))
  }, [])

  async function runOptimize() {
    if (!config) return
    const used = config // the form is disabled while busy, but keep the exact config anyway
    setBusy(true)
    setErrors([])
    try {
      const result = await optimize(used)
      setRun({ config: used, result })
      setSelected(defaultDesign(result.front))
      setPanelOpen(false) // give the 3D view the screen
    } catch (e) {
      setErrors(messagesOf(e))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    if (!defaults) return
    setConfig(defaults)
    setErrors([])
    setVersion((v) => v + 1)
  }

  const design = run?.result.front[selected]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
      {config ? (
        <TaskSetup key={version} config={config} units={units} busy={busy} open={panelOpen}
          onToggle={() => setPanelOpen((o) => !o)} onConfig={setConfig} onUnits={setUnits} onOptimize={runOptimize} onReset={reset} />
      ) : (
        <p className="whitespace-pre-line p-5 text-sm text-red-400">{errors.length ? errors.join('\n') : 'Loading defaults…'}</p>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <nav className="flex items-center gap-1 border-b border-slate-800 bg-slate-900/60 px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              disabled={!READY.includes(t)}
              title={READY.includes(t) ? undefined : 'Coming in the next step'}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                t === tab ? 'bg-slate-800 text-sky-400 ring-1 ring-slate-700' : 'text-slate-400 hover:text-slate-100 disabled:opacity-30'
              }`}
            >
              {t}
            </button>
          ))}
          {run && design && (
            <div className="ml-auto flex min-w-0 items-center gap-2 text-xs">
              <span className="whitespace-nowrap text-slate-500">
                {run.result.feasible_found ? 'Pareto front' : 'Closest designs'} · {run.result.front.length}
              </span>
              <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}
                className="min-w-0 max-w-xs truncate rounded-md bg-slate-800 px-2 py-1 text-slate-200 outline-none ring-1 ring-slate-700 focus:ring-sky-500">
                {run.result.front.map((d, i) => (
                  <option key={i} value={i}>{designLabel(d, units)}</option>
                ))}
              </select>
            </div>
          )}
        </nav>

        <div className="relative min-h-0 flex-1">
          {run && design ? (
            <ArmScene key={`${design.l1}-${design.l2}`} config={run.config} design={design} units={units} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-sm rounded-xl bg-slate-900 p-6 text-center ring-1 ring-slate-800">
                <p className="text-sm font-semibold text-slate-100">No design yet</p>
                <p className="mt-1 text-xs text-slate-400">Set the link limits, joint limits and task area on the left, then press Optimize.</p>
              </div>
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-sm ring-1 ring-slate-700">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                Optimizing… this can take up to about 25 seconds.
              </div>
            </div>
          )}
        </div>
      </main>

      {errors.length > 0 && config && (
        <div className="fixed bottom-4 right-4 max-w-sm rounded-xl bg-slate-900 p-4 text-sm shadow-2xl ring-1 ring-red-500/50">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-red-400">Please fix</span>
            <button onClick={() => setErrors([])} className="text-slate-500 hover:text-slate-200">✕</button>
          </div>
          <ul className="space-y-1 text-slate-300">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
