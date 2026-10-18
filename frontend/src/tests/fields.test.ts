import { describe, expect, it } from 'vitest'
import { parse, show, type Units } from '../lib/fields'

const CM_DEG: Units = { length: 'cm', angle: 'deg' }
const IN_RAD: Units = { length: 'in', angle: 'rad' }
const MM_DEG: Units = { length: 'mm', angle: 'deg' }

describe('show', () => {
  it('shows the defaults in each unit (hand values)', () => {
    expect(show(45, 'length', MM_DEG)).toBe('450')
    expect(show(45, 'length', IN_RAD)).toBe('17.7165')
    expect(show(2.6179938779914944, 'angle', CM_DEG)).toBe('150')
    expect(show(2.6179938779914944, 'angle', IN_RAD)).toBe('2.618')
    expect(show(0.5, 'percent', CM_DEG)).toBe('50')
  })
})

describe('parse', () => {
  it('converts typed values to canonical cm, rad and fraction', () => {
    expect(parse('450', 'length', MM_DEG)).toBeCloseTo(45)
    expect(parse('150', 'angle', CM_DEG)).toBeCloseTo(2.6179938779914944)
    expect(parse('50', 'percent', CM_DEG)).toBe(0.5)
  })

  it('rejects text that is not a number', () => {
    for (const bad of ['', '  ', 'abc', '1.2.3']) {
      expect(parse(bad, 'length', CM_DEG)).toBeNull()
    }
  })
})

describe('toggling units', () => {
  it('toggling away and back shows exactly the original value', () => {
    const canonical = 16.1 // stays untouched: only the display is derived
    const before = show(canonical, 'length', CM_DEG)
    show(canonical, 'length', IN_RAD) // user switches to inches...
    const after = show(canonical, 'length', CM_DEG) // ...and back to cm
    expect(after).toBe(before)
    expect(after).toBe('16.1')
  })

  it('a value typed in inches still shows cleanly after switching back to cm', () => {
    const typed = parse(show(16.1, 'length', IN_RAD), 'length', IN_RAD)! // "6.3386" in
    expect(show(typed, 'length', CM_DEG)).toBe('16.1')
  })
})
