import { useEffect, useState } from 'react'
import { ApiError, getDefaults, optimize, type Config, type Design, type OptimizeResult } from './api/client'
import RobotCanvas from './components/RobotCanvas'
import TaskSetup from './components/TaskSetup'
import { defaultDesign } from './lib/arm'
import { show, type Units } from './lib/fields'

function messagesOf(e: unknown): string[] {
  return e instanceof ApiError ? e.messages : [String(e)]
}

// A finished optimization together with the exact config it was computed with,
// so later views (/ik, /workspace, the arm drawing) use the same config as the results.
interface Run {
  config: Config
  result: OptimizeResult
}

function designLabel(d: Design, units: Units): string {
  const l1 = show(d.l1, 'length', units)
  const l2 = show(d.l2, 'length', units)
  return `l1 ${l1} + l2 ${l2} ${units.length} · coverage ${(100 * d.coverage).toFixed(1)}% · dexterity ${d.dexterity.toFixed(3)}`
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
    setRun(null)
    try {
      const result = await optimize(used)
      setRun({ config: used, result })
      setSelected(defaultDesign(result.front))
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
    <div className="flex h-screen">
      {config ? (
        <TaskSetup key={version} config={config} units={units} busy={busy} errors={errors}
          onConfig={setConfig} onUnits={setUnits} onOptimize={runOptimize} onReset={reset} />
      ) : (
        <p className="whitespace-pre-line p-5 text-sm text-red-600">
          {errors.length ? errors.join('\n') : 'Loading defaults…'}
        </p>
      )}
      <main className="flex-1 space-y-4 overflow-y-auto p-6">
        <h1 className="text-xl font-bold">Dexter</h1>
        {busy && <p className="text-sm">Optimizing… this can take up to about 25 seconds.</p>}
        {run && (
          <p className="text-sm">
            {run.result.feasible_found ? 'Pareto front' : 'No design meets the coverage floor; closest designs'}:{' '}
            {run.result.front.length} designs from {run.result.evaluations} evaluations.
          </p>
        )}
        {run && design && (
          <>
            <label className="block text-sm">
              Design{' '}
              <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}
                className="ml-2 max-w-full rounded border border-gray-300 px-2 py-1">
                {run.result.front.map((d, i) => (
                  <option key={i} value={i}>{designLabel(d, units)}</option>
                ))}
              </select>
            </label>
            <RobotCanvas key={`${design.l1}-${design.l2}`} config={run.config} design={design} units={units} />
          </>
        )}
      </main>
    </div>
  )
}
