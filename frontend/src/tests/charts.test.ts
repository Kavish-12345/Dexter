import { describe, expect, it } from 'vitest'
import type { Config, Design } from '../api/client'
import { baselineLength, highlights, toGrid } from '../lib/charts'

const CONFIG: Config = {
  link_min: 5, link_max: 30, max_total: 45, min_coverage: 0.5,
  theta1_limits: [-Math.PI, Math.PI], theta2_limits: [-2.618, 2.618],
  task_rects: [[10, 25, 5, 20]], grid_spacing: 1,
}

describe('toGrid', () => {
  it('rebuilds rows and columns from the flat meshgrid order', () => {
    // 3 columns (x = 0, 1, 2) by 2 rows (y = 5, 6)
    const x = [0, 1, 2, 0, 1, 2]
    const y = [5, 5, 5, 6, 6, 6]
    const { xs, ys, z } = toGrid(x, y, ['a', 'b', 'c', 'd', 'e', 'f'])
    expect(xs).toEqual([0, 1, 2])
    expect(ys).toEqual([5, 6])
    expect(z).toEqual([['a', 'b', 'c'], ['d', 'e', 'f']])
  })
})

describe('baselineLength', () => {
  it('matches the backend rule of thumb: farthest corner 32.02 cm -> 16.01 -> 16.1', () => {
    expect(baselineLength(CONFIG)).toBeCloseTo(16.1)
  })
})

describe('highlights', () => {
  const d = (l1: number, l2: number, coverage: number, dexterity: number) =>
    ({ l1, l2, length: l1 + l2, coverage, dexterity, feasible: true, shortfall: 0 }) as Design
  const front = [d(7, 15, 0.5, 0.82), d(14.6, 14.7, 0.953, 0.885), d(16, 16.1, 1, 0.914), d(17.1, 17.1, 1, 0.926)]

  it('picks the shortest, the shortest above 95%, the best coverage (shortest tie) and the most dexterous', () => {
    expect(highlights(front).map((h) => h.index)).toEqual([0, 1, 2, 3])
  })
})
