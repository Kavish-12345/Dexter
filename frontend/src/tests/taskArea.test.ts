import { describe, expect, it } from 'vitest'
import { overlapPair, rectFromDrag, rectsOverlap, snap, tourStops } from '../lib/taskArea'

describe('snap', () => {
  it('rounds to the nearest multiple of the step without float noise', () => {
    expect(snap(10.4, 1)).toBe(10)
    expect(snap(10.6, 1)).toBe(11)
    expect(snap(0.29, 0.1)).toBe(0.3)
  })
})

describe('rectFromDrag', () => {
  it('orders the corners and snaps them (drag from top-right to bottom-left)', () => {
    expect(rectFromDrag({ x: 25.3, y: 19.8 }, { x: 9.7, y: 5.2 }, 1)).toEqual([10, 25, 5, 20])
  })

  it('returns null for a click or a drag that snaps to zero width or height', () => {
    expect(rectFromDrag({ x: 10, y: 5 }, { x: 10, y: 5 }, 1)).toBeNull()
    expect(rectFromDrag({ x: 10, y: 5 }, { x: 10.2, y: 15 }, 1)).toBeNull()
  })
})

describe('rectsOverlap / overlapPair', () => {
  it('flags overlapping and touching areas, like the backend', () => {
    expect(rectsOverlap([10, 25, 5, 20], [20, 30, 15, 25])).toBe(true) // overlap
    expect(rectsOverlap([10, 25, 5, 20], [25, 30, 5, 20])).toBe(true) // shared edge
    expect(rectsOverlap([10, 25, 5, 20], [-25, -10, -20, -5])).toBe(false)
  })

  it('names the first overlapping pair', () => {
    expect(overlapPair([[10, 25, 5, 20], [-25, -10, 5, 20], [-20, -12, 10, 30]])).toBe('B and C')
    expect(overlapPair([[10, 25, 5, 20], [-25, -10, 5, 20]])).toBeNull()
  })
})

describe('tourStops', () => {
  it('picks the covered point nearest each area centre and skips areas with none covered', () => {
    const task = {
      x: [0, 2, 4, 10, 12, 30], y: [0, 0, 0, 0, 0, 0],
      covered: [true, false, true, true, true, false],
      area: [0, 0, 0, 1, 1, 2], area_coverage: [],
    }
    const rects: [number, number, number, number][] = [[0, 4, 0, 0], [10, 12, 0, 0], [30, 30, 0, 0]]
    // area A: centre x = 2 is not covered, so the nearest covered point (x = 0, first found) is used
    expect(tourStops(task, rects)).toEqual([{ area: 0, x: 0, y: 0 }, { area: 1, x: 10, y: 0 }])
  })
})

