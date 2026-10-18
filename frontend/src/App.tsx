import { useEffect, useState } from 'react'
import { ApiError, getDefaults, optimize, type Config, type OptimizeResult } from './api'
import type { Units } from './fields'
import TaskSetup from './TaskSetup'

function messagesOf(e: unknown): string[] {
  return e instanceof ApiError ? e.messages : [String(e)]
}

// A finished optimization together with the exact config it was computed with,
// so later views (/ik, /workspace, the arm drawing) use the same config as the results.
interface Run {
  config: Config
  result: OptimizeResult
}

export default function App() {
  const [defaults, setDefaults] = useState<Config | null>(null)
  const [config, setConfig] = useState<Config | null>(null) // canonical: cm, rad, fraction
  const [units, setUnits] = useState<Units>({ length: 'cm', angle: 'deg' })
  const [version, setVersion] = useState(0) // bumped on reset so the form re-derives its fields
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [run, setRun] = useState<Run | null>(null)

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
      setRun({ config: used, result: await optimize(used) })
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
      <main className="flex-1 p-6">
        <h1 className="text-xl font-bold">Dexter</h1>
        {busy && <p className="mt-4 text-sm">Optimizing… this can take up to about 25 seconds.</p>}
        {run && (
          <p className="mt-4 text-sm">
            {run.result.feasible_found ? 'Pareto front' : 'No design meets the coverage floor; closest designs'}:{' '}
            {run.result.front.length} designs from {run.result.evaluations} evaluations.
          </p>
        )}
      </main>
    </div>
  )
}
