import { describe, expect, it } from 'vitest'
import { fromCm, fromRad, toCm, toRad } from '../lib/units'

describe('lengths', () => {
  it('converts each unit to cm (hand values)', () => {
    expect(toCm(50, 'mm')).toBeCloseTo(5)
    expect(toCm(5, 'cm')).toBe(5)
    expect(toCm(0.3, 'm')).toBeCloseTo(30)
    expect(toCm(1, 'in')).toBeCloseTo(2.54)
  })

  it('converts the default 45 cm max total back for display', () => {
    expect(fromCm(45, 'mm')).toBeCloseTo(450)
    expect(fromCm(45, 'm')).toBeCloseTo(0.45)
    expect(fromCm(45, 'in')).toBeCloseTo(17.7165, 3) // 45 / 2.54
  })

  it('round-trips every length unit', () => {
    for (const unit of ['mm', 'cm', 'm', 'in'] as const) {
      expect(fromCm(toCm(16.1, unit), unit)).toBeCloseTo(16.1, 10)
    }
  })
})

describe('angles', () => {
  it('converts to radians (hand values)', () => {
    expect(toRad(180, 'deg')).toBeCloseTo(Math.PI)
    expect(toRad(150, 'deg')).toBeCloseTo(2.6179938779914944) // backend theta2 limit
    expect(toRad(1.2, 'rad')).toBe(1.2)
  })

  it('converts radians back to degrees', () => {
    expect(fromRad(Math.PI / 2, 'deg')).toBeCloseTo(90)
    expect(fromRad(-0.2661, 'deg')).toBeCloseTo(-15.25, 1) // /ik hand trace, elbow +1
  })

  it('round-trips both angle units', () => {
    for (const unit of ['deg', 'rad'] as const) {
      expect(toRad(fromRad(-2.618, unit), unit)).toBeCloseTo(-2.618, 10)
    }
  })
})
