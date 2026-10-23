import { useEffect, useState } from 'react'
import { ApiError, getDefaults, optimize, type Config, type OptimizeResult } from './api/client'
import ArmScene from './components/arm/ArmScene'
import ComparisonTab from './components/charts/ComparisonTab'
import DexterityTab from './components/charts/DexterityTab'
import ParetoTab from './components/charts/ParetoTab'
import WorkspaceTab from './components/charts/WorkspaceTab'
import DesignSelect from './components/DesignSelect'
import HowItWorks from './components/landing/HowItWorks'
import Landing from './components/landing/Landing'
import SiteHeader, { type SitePage } from './components/landing/SiteHeader'
import TheMath from './components/landing/TheMath'
import TaskSetup from './components/TaskSetup'
import { defaultDesign } from './lib/arm'
import type { Units } from './lib/fields'
import { load, save } from './lib/persist'

function messagesOf(e: unknown): string[] {
  return e instanceof ApiError ? e.messages : [String(e)]
}

// A finished optimization together with the exact config it was computed with,
// so later views (/ik, /workspace, the arm) use the same config as the results.
interface Run {
  config: Config
  result: OptimizeResult
}

const TABS = ['3D Arm', 'Workspace', 'Dexterity', 'Pareto', 'Comparison'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  const [defaults, setDefaults] = useState<Config | null>(null)
  // Everything below except busy/errors/defaults is restored from localStorage, so a reload
  // returns to the same page, settings and last result (lib/persist.ts).
  const [config, setConfig] = useState<Config | null>(() => load<Config | null>('config', null)) // canonical: cm, rad, fraction
  const [units, setUnits] = useState<Units>(() => load<Units>('units', { length: 'mm', angle: 'deg' }))
  const [version, setVersion] = useState(0) // bumped on reset so the form re-derives its fields
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [run, setRun] = useState<Run | null>(() => load<Run | null>('run', null))
  const [selected, setSelected] = useState(() => load('selected', 0)) // index into run.result.front
  const [panelOpen, setPanelOpen] = useState(() => load('panelOpen', true))
  const [tab, setTab] = useState<Tab>(() => {
    const t = load<string>('tab', '3D Arm')
    return (TABS as readonly string[]).includes(t) ? (t as Tab) : '3D Arm'
  })
  const [page, setPage] = useState<SitePage | 'app'>(() => load<SitePage | 'app'>('page', 'landing'))

  useEffect(() => {
    getDefaults()
      .then((d) => {
        setDefaults(d)
        setConfig((c) => c ?? d) // keep the restored settings if there are any
      })
      .catch((e) => setErrors(messagesOf(e)))
  }, [])

  useEffect(() => save('config', config), [config])
  useEffect(() => save('units', units), [units])
  useEffect(() => save('run', run), [run])
  useEffect(() => save('selected', selected), [selected])
  useEffect(() => save('panelOpen', panelOpen), [panelOpen])
  useEffect(() => save('tab', tab), [tab])
  useEffect(() => save('page', page), [page])

  // a restored index can be stale if the saved run changed shape; fall back to the first design
  useEffect(() => {
    if (run && selected >= run.result.front.length) setSelected(0)
  }, [run, selected])

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
    // a full fresh start: default settings and no result (the saved copies update with the state)
    setConfig(defaults)
    setErrors([])
    setRun(null)
    setSelected(0)
    setUnits({ length: 'mm', angle: 'deg' })
    setTab('3D Arm')
    setPanelOpen(true)
    setVersion((v) => v + 1)
  }

  const design = run?.result.front[selected]

  // Public pages share one header that stays mounted, so its underline can slide between links.
  if (page !== 'app') {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <SiteHeader page={page} onNavigate={setPage} />
        {page === 'landing' && <Landing onStart={() => setPage('app')} />}
        {page === 'how' && <HowItWorks onStart={() => setPage('app')} />}
        {page === 'math' && <TheMath onStart={() => setPage('app')} />}
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 text-stone-900">
      {config ? (
        <TaskSetup key={version} config={config} units={units} busy={busy} open={panelOpen}
          onToggle={() => setPanelOpen((o) => !o)} onHome={() => setPage('landing')} onConfig={setConfig}
          onUnits={setUnits} onOptimize={runOptimize} onReset={reset} />
      ) : (
        <div className="space-y-3 p-5 text-sm">
          <p className="whitespace-pre-line text-rose-600">{errors.length ? errors.join('\n') : 'Loading defaults…'}</p>
          <button onClick={() => setPage('landing')} className="text-stone-500 hover:text-stone-900">← Back to home</button>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <nav className="flex items-center gap-1 border-b border-stone-200 bg-white px-4">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-3 text-[11px] leading-4 font-bold uppercase tracking-widest transition ${
                t === tab ? 'border-orange-500 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-900 disabled:opacity-40'
              }`}
            >
              {t}
            </button>
          ))}
          {run && design && (
            <div className="ml-auto flex min-w-0 items-center gap-2 text-xs">
              <span className="whitespace-nowrap text-stone-500">
                {run.result.feasible_found ? 'Pareto front' : 'Closest designs'} · {run.result.front.length}
              </span>
              <DesignSelect designs={run.result.front} selected={selected} units={units} disabled={busy} onSelect={setSelected} />
            </div>
          )}
        </nav>

        <div className="relative min-h-0 flex-1">
          {busy ? null : run && design ? ( // the old scene is hidden while a new run computes
            <>
              {tab === '3D Arm' && (
                <ArmScene key={`${design.l1}-${design.l2}`} config={run.config} design={design} units={units} panelOpen={panelOpen} />
              )}
              {tab === 'Workspace' && <WorkspaceTab key={`${design.l1}-${design.l2}`} config={run.config} design={design} units={units} />}
              {tab === 'Dexterity' && <DexterityTab key={`${design.l1}-${design.l2}`} config={run.config} design={design} units={units} />}
              {tab === 'Pareto' && <ParetoTab front={run.result.front} selected={selected} units={units} onSelect={setSelected} />}
              {tab === 'Comparison' && (
                <ComparisonTab config={run.config} front={run.result.front} selected={selected} units={units} onSelect={setSelected} />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-200">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">◎</span>
                <p className="mt-3 text-sm font-semibold text-stone-900">No design yet</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">Set the link limits, joint limits and task area on the left, then press Optimize.</p>
              </div>
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-50/70 backdrop-blur-sm">
              <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm text-stone-700 shadow-lg ring-1 ring-stone-200">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                Optimizing… this can take up to about 25 seconds.
              </div>
            </div>
          )}
        </div>
      </main>

      {errors.length > 0 && config && (
        <div className="fixed bottom-4 right-4 max-w-sm rounded-xl bg-white p-4 text-sm shadow-xl ring-1 ring-rose-200">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-rose-600">Please fix</span>
            <button onClick={() => setErrors([])} className="text-stone-400 hover:text-stone-800">✕</button>
          </div>
          <ul className="space-y-1 text-stone-700">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
