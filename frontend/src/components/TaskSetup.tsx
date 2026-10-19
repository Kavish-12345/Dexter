import { useState } from 'react'
import type { Config } from '../api/client'
import { parse, show, type Kind, type Units } from '../lib/fields'
import type { AngleUnit, LengthUnit } from '../lib/units'
import TaskAreaModal from './TaskAreaModal'
import TaskAreaPicker from './TaskAreaPicker'

const LENGTH_UNITS: LengthUnit[] = ['mm', 'cm', 'm', 'in']
const ANGLE_UNITS: AngleUnit[] = ['deg', 'rad']

interface Field {
  label: string
  kind: Kind
  get: (c: Config) => number
  set: (c: Config, v: number) => Config
}

// Copy of a fixed-length array with one entry replaced (for theta limits and task_rect).
function replace<T extends number[]>(arr: T, i: number, v: number): T {
  return arr.map((x, j) => (j === i ? v : x)) as T
}

const LINK_FIELDS: Field[] = [
  { label: 'Min link', kind: 'length', get: (c) => c.link_min, set: (c, v) => ({ ...c, link_min: v }) },
  { label: 'Max link', kind: 'length', get: (c) => c.link_max, set: (c, v) => ({ ...c, link_max: v }) },
  { label: 'Max total', kind: 'length', get: (c) => c.max_total, set: (c, v) => ({ ...c, max_total: v }) },
  { label: 'Min cover', kind: 'percent', get: (c) => c.min_coverage, set: (c, v) => ({ ...c, min_coverage: v }) },
]

const JOINT_FIELDS: Field[] = [
  { label: 'θ1 min', kind: 'angle', get: (c) => c.theta1_limits[0], set: (c, v) => ({ ...c, theta1_limits: replace(c.theta1_limits, 0, v) }) },
  { label: 'θ1 max', kind: 'angle', get: (c) => c.theta1_limits[1], set: (c, v) => ({ ...c, theta1_limits: replace(c.theta1_limits, 1, v) }) },
  { label: 'θ2 min', kind: 'angle', get: (c) => c.theta2_limits[0], set: (c, v) => ({ ...c, theta2_limits: replace(c.theta2_limits, 0, v) }) },
  { label: 'θ2 max', kind: 'angle', get: (c) => c.theta2_limits[1], set: (c, v) => ({ ...c, theta2_limits: replace(c.theta2_limits, 1, v) }) },
]

const TASK_FIELDS: Field[] = [
  { label: 'x min', kind: 'length', get: (c) => c.task_rect[0], set: (c, v) => ({ ...c, task_rect: replace(c.task_rect, 0, v) }) },
  { label: 'x max', kind: 'length', get: (c) => c.task_rect[1], set: (c, v) => ({ ...c, task_rect: replace(c.task_rect, 1, v) }) },
  { label: 'y min', kind: 'length', get: (c) => c.task_rect[2], set: (c, v) => ({ ...c, task_rect: replace(c.task_rect, 2, v) }) },
  { label: 'y max', kind: 'length', get: (c) => c.task_rect[3], set: (c, v) => ({ ...c, task_rect: replace(c.task_rect, 3, v) }) },
  { label: 'Grid step', kind: 'length', get: (c) => c.grid_spacing, set: (c, v) => ({ ...c, grid_spacing: v }) },
]

function unitLabel(kind: Kind, units: Units): string {
  return kind === 'length' ? units.length : kind === 'angle' ? units.angle : '%'
}

function Segmented<T extends string>(props: { value: T; options: T[]; disabled: boolean; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg bg-stone-100 p-0.5 ring-1 ring-stone-200">
      {props.options.map((o) => (
        <button
          key={o}
          disabled={props.disabled}
          onClick={() => props.onChange(o)}
          className={`flex-1 rounded-md px-2 py-1 text-xs transition ${
            o === props.value ? 'bg-white font-semibold text-orange-600 shadow-sm ring-1 ring-stone-200' : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

// Compact field: label left, number + unit right. Keeps the raw text while typing;
// the canonical value lives in App.
function NumberField(props: { label: string; unit: string; initial: string; invalid: boolean; disabled: boolean; onText: (t: string) => void }) {
  const [text, setText] = useState(props.initial)
  return (
    <label
      className={`flex items-center justify-between gap-1 rounded-lg bg-stone-50 px-2 py-1.5 text-xs ring-1 transition focus-within:bg-white focus-within:ring-orange-400 ${
        props.invalid ? 'ring-rose-500' : 'ring-stone-200'
      }`}
    >
      <span className="whitespace-nowrap text-stone-500">{props.label}</span>
      <span className="flex items-center gap-1">
        <input
          value={text}
          inputMode="decimal"
          disabled={props.disabled}
          onChange={(e) => {
            setText(e.target.value)
            props.onText(e.target.value)
          }}
          className="w-12 bg-transparent text-right font-mono text-stone-900 outline-none disabled:text-stone-400"
        />
        <span className="w-5 text-[10px] text-stone-400">{props.unit}</span>
      </span>
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">{title}</h3>
      {children}
    </section>
  )
}

interface Props {
  config: Config
  units: Units
  busy: boolean
  open: boolean
  onToggle: () => void
  onHome: () => void
  onConfig: (c: Config) => void
  onUnits: (u: Units) => void
  onOptimize: () => void
  onReset: () => void
}

export default function TaskSetup({ config, units, busy, open, onToggle, onHome, onConfig, onUnits, onOptimize, onReset }: Props) {
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const [rectVersion, setRectVersion] = useState(0) // bumped when the drawing board changes the task area
  const [drawing, setDrawing] = useState(false) // task-area modal open

  if (!open) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center gap-4 border-r border-stone-200 bg-white py-4">
        <button onClick={onToggle} title="Open task setup" className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 hover:text-orange-600">
          ☰
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 [writing-mode:vertical-rl]">Task setup</span>
      </aside>
    )
  }

  function edit(f: Field, text: string) {
    const v = parse(text, f.kind, units)
    setInvalid((prev) => {
      const next = new Set(prev)
      if (v === null) next.add(f.label)
      else next.delete(f.label)
      return next
    })
    if (v !== null) onConfig(f.set(config, v))
  }

  function changeUnits(u: Units) {
    setInvalid(new Set()) // fields are re-derived from the canonical (valid) values
    onUnits(u)
  }

  const fields = (list: Field[], extraKey = '') =>
    list.map((f) => (
      <NumberField
        key={`${f.label}-${units.length}-${units.angle}-${extraKey}`} // new units -> field re-derived
        label={f.label}
        unit={unitLabel(f.kind, units)}
        initial={show(f.get(config), f.kind, units)}
        invalid={invalid.has(f.label)}
        disabled={busy}
        onText={(t) => edit(f, t)}
      />
    ))

  return (
    <aside className="flex h-screen w-80 shrink-0 flex-col gap-3 overflow-hidden border-r border-stone-200 bg-white px-4 py-3">
      <header className="flex items-center justify-between">
        <button onClick={onHome} title="Back to the home page" className="flex items-center gap-2 text-left">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-stone-900 text-xs font-bold text-white">D</span>
          <span>
            <span className="block text-sm font-bold tracking-tight text-stone-900">Dexter</span>
            <span className="block text-[11px] text-stone-500">2-link arm design optimizer</span>
          </span>
        </button>
        <button onClick={onToggle} title="Collapse" className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-orange-600">
          ‹
        </button>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Segmented value={units.length} options={LENGTH_UNITS} disabled={busy} onChange={(v) => changeUnits({ ...units, length: v })} />
        <Segmented value={units.angle} options={ANGLE_UNITS} disabled={busy} onChange={(v) => changeUnits({ ...units, angle: v })} />
      </div>

      <Section title="Links">
        <div className="grid grid-cols-2 gap-1.5">{fields(LINK_FIELDS)}</div>
      </Section>

      <Section title="Joint limits">
        <div className="grid grid-cols-2 gap-1.5">{fields(JOINT_FIELDS)}</div>
      </Section>

      <Section title="Task area">
        {/* small read-only preview; the button opens the drawing board */}
        <div className="relative h-28 overflow-hidden rounded-lg bg-stone-50 ring-1 ring-stone-200">
          <TaskAreaPicker rect={config.task_rect} reach={config.max_total} step={config.grid_spacing} units={units} mode="preview" />
          <button
            onClick={() => setDrawing(true)}
            disabled={busy}
            className="absolute bottom-2 right-2 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-orange-600 shadow-sm ring-1 ring-stone-200 transition hover:ring-orange-300 disabled:opacity-40"
          >
            Set task area
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">{fields(TASK_FIELDS, String(rectVersion))}</div>
      </Section>

      {drawing && (
        <TaskAreaModal
          rect={config.task_rect}
          reach={config.max_total}
          step={config.grid_spacing}
          units={units}
          onClose={() => setDrawing(false)}
          onApply={(r) => {
            onConfig({ ...config, task_rect: r })
            setRectVersion((v) => v + 1)
          }}
        />
      )}

      <div className="mt-auto space-y-1.5">
        {invalid.size > 0 && <p className="text-xs text-rose-600">Fix the fields marked red (numbers only).</p>}
        <div className="flex gap-2">
          <button
            onClick={onOptimize}
            disabled={busy || invalid.size > 0}
            className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-40"
          >
            {busy ? 'Optimizing…' : 'Optimize'}
          </button>
          <button
            onClick={onReset}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 ring-1 ring-stone-300 transition hover:bg-stone-50 disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </div>
    </aside>
  )
}
