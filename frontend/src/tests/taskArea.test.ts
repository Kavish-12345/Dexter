import { describe, expect, it } from 'vitest'
import { rectFromDrag, snap } from '../lib/taskArea'

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
