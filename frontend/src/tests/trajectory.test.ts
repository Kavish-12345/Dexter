import { describe, expect, it } from 'vitest'
import { cubic } from '../lib/trajectory'

describe('cubic joint trajectory', () => {
  it('starts and ends at the given angles', () => {
    expect(cubic(0.2, 1.4, 1, 0)).toBeCloseTo(0.2)
    expect(cubic(0.2, 1.4, 1, 1)).toBeCloseTo(1.4)
  })

  it('is exactly halfway at half time (3/4 - 2/8 = 1/2)', () => {
    expect(cubic(0, 2, 1, 0.5)).toBeCloseTo(1)
  })

  it('has zero velocity at both ends', () => {
    const h = 1e-4
    expect((cubic(0, 1, 1, h) - cubic(0, 1, 1, 0)) / h).toBeCloseTo(0, 3)
    expect((cubic(0, 1, 1, 1) - cubic(0, 1, 1, 1 - h)) / h).toBeCloseTo(0, 3)
  })

  it('holds the end poses outside 0..tf', () => {
    expect(cubic(0.2, 1.4, 1, -0.5)).toBeCloseTo(0.2)
    expect(cubic(0.2, 1.4, 1, 2)).toBeCloseTo(1.4)
  })

  it('never overshoots, so a move between two in-limit angles stays in the limits', () => {
    let prev = -Infinity
    for (let t = 0; t <= 1; t += 0.01) {
      const v = cubic(-1, 2, 1, t)
      expect(v).toBeGreaterThanOrEqual(prev)
      expect(v).toBeGreaterThanOrEqual(-1 - 1e-12)
      expect(v).toBeLessThanOrEqual(2 + 1e-12)
      prev = v
    }
  })
})
