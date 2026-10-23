import { describe, expect, it } from 'vitest'
import type { Config, Design, IkSolution } from '../api/client'
import { defaultDesign, forwardKinematics, moveDuration, pickSolution, shiftIntoLimits } from '../lib/arm'

const CONFIG: Config = {
  link_min: 5, link_max: 30, max_total: 45, min_coverage: 0.5,
  theta1_limits: [-Math.PI, Math.PI], theta2_limits: [-2.618, 2.618],
  task_rects: [[10, 25, 5, 20]], grid_spacing: 1,
}

// /ik for l1 = l2 = 10 at (10, 10): elbow +1 -> (0, 90 deg), elbow -1 -> (90, -90 deg)
const SOLUTIONS: IkSolution[] = [
  { elbow: 1, theta1: 0, theta2: Math.PI / 2, reachable: true, within_limits: true },
  { elbow: -1, theta1: Math.PI / 2, theta2: -Math.PI / 2, reachable: true, within_limits: true },
]

describe('forwardKinematics', () => {
  it('matches the backend hand check (theta1 = 0, theta2 = 90 deg, l1 = l2 = 10)', () => {
    const { elbow, hand } = forwardKinematics(0, Math.PI / 2, 10, 10)
    expect(elbow.x).toBeCloseTo(10)
    expect(elbow.y).toBeCloseTo(0)
    expect(hand.x).toBeCloseTo(10)
    expect(hand.y).toBeCloseTo(10)
  })
})

describe('shiftIntoLimits', () => {
  it('uses the +-360 deg rule like the backend', () => {
    expect(shiftIntoLimits(-Math.PI / 2, 0, 1.5 * Math.PI)).toBeCloseTo(1.5 * Math.PI) // -90 -> 270
    expect(shiftIntoLimits(Math.PI / 2, -Math.PI / 4, Math.PI / 4)).toBeNull()
  })
})

describe('pickSolution', () => {
  it('picks the solution needing the smaller joint change', () => {
    expect(pickSolution(SOLUTIONS, { t1: 0.1, t2: 1.4 }, CONFIG).best?.pose.t1).toBeCloseTo(0)
    expect(pickSolution(SOLUTIONS, { t1: 1.4, t2: -1.4 }, CONFIG).best?.pose.t1).toBeCloseTo(Math.PI / 2)
  })

  it('skips a solution outside the joint limits and returns it as a red ghost', () => {
    const limited: Config = { ...CONFIG, theta1_limits: [-0.5, 0.5] } // elbow -1 needs theta1 = 90 deg
    const { best, other } = pickSolution(SOLUTIONS, { t1: 1.4, t2: -1.4 }, limited)
    expect(best?.pose.t1).toBeCloseTo(0)
    expect(other?.ok).toBe(false)
  })
})

describe('moveDuration', () => {
  it('scales with the largest joint turn, within the min and max time', () => {
    expect(moveDuration({ t1: 0, t2: 0 }, { t1: 2, t2: 0.5 }, 2, 0.5, 3)).toBeCloseTo(1) // 2 rad at 2 rad/s
    expect(moveDuration({ t1: 0, t2: 0 }, { t1: 0.1, t2: 0 }, 2, 0.5, 3)).toBeCloseTo(0.5) // floor
    expect(moveDuration({ t1: 0, t2: 0 }, { t1: 10, t2: 0 }, 2, 0.5, 3)).toBeCloseTo(3) // ceiling
  })
})

describe('defaultDesign', () => {
  const d = (coverage: number, length: number) => ({ l1: length / 2, l2: length / 2, coverage, length, dexterity: 0.9, feasible: true, shortfall: 0 }) as Design

  it('picks the shortest design with coverage >= 95%, else the first', () => {
    expect(defaultDesign([d(0.5, 22), d(0.96, 30), d(1, 32)])).toBe(1)
    expect(defaultDesign([d(0.5, 22), d(0.6, 25)])).toBe(0)
  })
})
