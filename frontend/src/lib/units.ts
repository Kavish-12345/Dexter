// Unit conversion for the UI. The backend always works in cm and radians;
// values are converted here just before sending and just after receiving.

export type LengthUnit = 'mm' | 'cm' | 'm' | 'in'
export type AngleUnit = 'deg' | 'rad'

// How many cm one of each unit is (1 in = 2.54 cm exactly).
const CM_PER: Record<LengthUnit, number> = { mm: 0.1, cm: 1, m: 100, in: 2.54 }

export function toCm(value: number, unit: LengthUnit): number {
  return value * CM_PER[unit]
}

export function fromCm(value: number, unit: LengthUnit): number {
  return value / CM_PER[unit]
}

export function toRad(value: number, unit: AngleUnit): number {
  return unit === 'deg' ? (value * Math.PI) / 180 : value
}

export function fromRad(value: number, unit: AngleUnit): number {
  return unit === 'deg' ? (value * 180) / Math.PI : value
}
