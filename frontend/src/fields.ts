// Display <-> canonical conversion for the TaskSetup form.
// Canonical values (what the API gets) are cm, radians and coverage as a fraction.
// The form derives what it shows from them, so toggling units can never drift.
import { fromCm, fromRad, toCm, toRad, type AngleUnit, type LengthUnit } from './units'

export type Kind = 'length' | 'angle' | 'percent'

export interface Units {
  length: LengthUnit
  angle: AngleUnit
}

// Up to 4 decimals, without trailing zeros or float noise (16.1, not 16.100000000000001).
function tidy(v: number): string {
  return String(Number(v.toFixed(4)))
}

/** Canonical value -> text shown in the form. */
export function show(value: number, kind: Kind, units: Units): string {
  if (kind === 'length') return tidy(fromCm(value, units.length))
  if (kind === 'angle') return tidy(fromRad(value, units.angle))
  return tidy(value * 100) // coverage fraction -> percent
}

/** Text typed by the user -> canonical value, or null if it is not a number. */
export function parse(text: string, kind: Kind, units: Units): number | null {
  if (text.trim() === '') return null
  const v = Number(text)
  if (!Number.isFinite(v)) return null
  if (kind === 'length') return toCm(v, units.length)
  if (kind === 'angle') return toRad(v, units.angle)
  return v / 100
}
