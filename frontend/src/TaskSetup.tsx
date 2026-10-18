import { useState } from 'react'
import type { Config } from './api'
import { parse, show, type Kind, type Units } from './fields'
import type { AngleUnit, LengthUnit } from './units'

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

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: 'Links',
    fields: [
      { label: 'Min link', kind: 'length', get: (c) => c.link_min, set: (c, v) => ({ ...c, link_min: v }) },
      { label: 'Max link', kind: 'length', get: (c) => c.link_max, set: (c, v) => ({ ...c, link_max: v }) },
      { label: 'Max total', kind: 'length', get: (c) => c.max_total, set: (c, v) => ({ ...c, max_total: v }) },
      { label: 'Min coverage', kind: 'percent', get: (c) => c.min_coverage, set: (c, v) => ({ ...c, min_coverage: v }) },
    ],
  },
  {
    title: 'Joint limits',
    fields: [
      { label: 'θ1 min', kind: 'angle', get: (c) => c.theta1_limits[0], set: (c, v) => ({ ...c, theta1_limits: replace(c.theta1_limits, 0, v) }) },
      { label: 'θ1 max', kind: 'angle', get: (c) => c.theta1_limits[1], set: (c, v) => ({ ...c, theta1_limits: replace(c.theta1_limits, 1, v) }) },
      { label: 'θ2 min', kind: 'angle', get: (c) => c.theta2_limits[0], set: (c, v) => ({ ...c, theta2_limits: replace(c.theta2_limits, 0, v) }) },
      { label: 'θ2 max', kind: 'angle', get: (c) => c.theta2_limits[1], set: (c, v) => ({ ...c, theta2_limits: replace(c.theta2_limits, 1, v) }) },
    ],
  },
  {
    title: 'Task area',
    fields: [
      { label: 'x min', kind: 'length', get: (c) => c.task_rect[0], set: (c, v) => ({ ...c, task_rect: replace(c.task_rect, 0, v) }) },
      { label: 'x max', kind: 'length', get: (c) => c.task_rect[1], set: (c, v) => ({ ...c, task_rect: replace(c.task_rect, 1, v) }) },
      { label: 'y min', kind: 'length', get: (c) => c.task_rect[2], set: (c, v) => ({ ...c, task_rect: replace(c.task_rect, 2, v) }) },
      { label: 'y max', kind: 'length', get: (c) => c.task_rect[3], set: (c, v) => ({ ...c, task_rect: replace(c.task_rect, 3, v) }) },
      { label: 'Grid spacing', kind: 'length', get: (c) => c.grid_spacing, set: (c, v) => ({ ...c, grid_spacing: v }) },
    ],
  },
]

function unitLabel(kind: Kind, units: Units): string {
  return kind === 'length' ? units.length : kind === 'angle' ? units.angle : '%'
}

// Keeps the user's raw text while typing; the canonical value lives in App.
function NumberField(props: {
  label: string
  unit: string
  initial: string
  invalid: boolean
  disabled: boolean
  onText: (t: string) => void
}) {
  const [text, setText] = useState(props.initial)
  return (
    <label className="text-sm">
      {props.label} <span className="text-gray-500">({props.unit})</span>
      <input
        value={text}
        inputMode="decimal"
        disabled={props.disabled}
        onChange={(e) => {
          setText(e.target.value)
          props.onText(e.target.value)
        }}
        className={`mt-1 block w-full rounded border px-2 py-1 disabled:bg-gray-100 ${props.invalid ? 'border-red-500' : 'border-gray-300'}`}
      />
    </label>
  )
}

interface Props {
  config: Config
  units: Units
  busy: boolean
  errors: string[]
  onConfig: (c: Config) => void
  onUnits: (u: Units) => void
  onOptimize: () => void
  onReset: () => void
}

export default function TaskSetup({ config, units, busy, errors, onConfig, onUnits, onOptimize, onReset }: Props) {
  const [invalid, setInvalid] = useState<Set<string>>(new Set())

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

  return (
    <aside className="w-80 shrink-0 space-y-5 overflow-y-auto border-r border-gray-200 p-5">
      <h2 className="text-lg font-semibold">Task setup</h2>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label>
          Length unit
          <select value={units.length} onChange={(e) => changeUnits({ ...units, length: e.target.value as LengthUnit })}
            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1">
            {LENGTH_UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label>
          Angle unit
          <select value={units.angle} onChange={(e) => changeUnits({ ...units, angle: e.target.value as AngleUnit })}
            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1">
            {ANGLE_UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
      </div>

      {GROUPS.map((g) => (
        <fieldset key={g.title}>
          <legend className="mb-2 text-sm font-semibold text-gray-700">{g.title}</legend>
          <div className="grid grid-cols-2 gap-3">
            {g.fields.map((f) => (
              <NumberField
                key={`${f.label}-${units.length}-${units.angle}`} // new units -> field re-derived
                label={f.label}
                unit={unitLabel(f.kind, units)}
                initial={show(f.get(config), f.kind, units)}
                invalid={invalid.has(f.label)}
                disabled={busy}
                onText={(t) => edit(f, t)}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex gap-2">
        <button onClick={onOptimize} disabled={busy || invalid.size > 0}
          className="flex-1 rounded bg-blue-600 px-3 py-2 font-medium text-white disabled:opacity-50">
          {busy ? 'Optimizing…' : 'Optimize'}
        </button>
        <button onClick={onReset} disabled={busy} className="rounded border border-gray-300 px-3 py-2 disabled:opacity-50">
          Reset
        </button>
      </div>

      {invalid.size > 0 && <p className="text-sm text-red-600">Fix the fields marked red (numbers only).</p>}
      {errors.length > 0 && (
        <ul className="space-y-1 text-sm text-red-600">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </aside>
  )
}
