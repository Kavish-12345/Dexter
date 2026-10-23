// Arm geometry for drawing. The backend does the real kinematics; this repeats FK
// (Craig Eqs. 4.10, 4.11) so the arm can be redrawn every animation frame.
import type { Config, Design, IkSolution } from '../api/client'

export interface Pose {
  t1: number // theta1, rad
  t2: number // theta2, rad
}

export interface Point {
  x: number
  y: number
}

const TOL = 1e-9 // same tolerance as the backend

export function forwardKinematics(t1: number, t2: number, l1: number, l2: number): { elbow: Point; hand: Point } {
  const elbow = { x: l1 * Math.cos(t1), y: l1 * Math.sin(t1) }
  const hand = { x: elbow.x + l2 * Math.cos(t1 + t2), y: elbow.y + l2 * Math.sin(t1 + t2) }
  return { elbow, hand }
}

/** The copy of theta (itself, +360 deg or -360 deg) that lies in [lo, hi], or null. Same rule as the backend. */
export function shiftIntoLimits(theta: number, lo: number, hi: number): number | null {
  for (const t of [theta, theta + 2 * Math.PI, theta - 2 * Math.PI]) {
    if (t >= lo - TOL && t <= hi + TOL) return t
  }
  return null
}

/** Middle of each joint range: a starting pose that is always inside the limits. */
export function midPose(config: Config): Pose {
  const [a, b] = config.theta1_limits
  const [c, d] = config.theta2_limits
  return { t1: (a + b) / 2, t2: (c + d) / 2 }
}

export interface Option {
  pose: Pose
  ok: boolean // inside the joint limits
}

/** Of the reachable IK solutions, move to the one inside the limits that needs the smallest
 *  total joint change from the current pose; the other solution is returned for the ghost. */
export function pickSolution(
  solutions: IkSolution[],
  from: Pose,
  config: Config,
): { best: Option | null; other: Option | null } {
  const options: Option[] = solutions
    .filter((s) => s.reachable && s.theta1 !== null && s.theta2 !== null)
    .map((s) => {
      const t1 = shiftIntoLimits(s.theta1!, ...config.theta1_limits)
      const t2 = shiftIntoLimits(s.theta2!, ...config.theta2_limits)
      return { pose: { t1: t1 ?? s.theta1!, t2: t2 ?? s.theta2! }, ok: t1 !== null && t2 !== null }
    })
  const change = (p: Pose) => Math.abs(p.t1 - from.t1) + Math.abs(p.t2 - from.t2)
  const best = options.filter((o) => o.ok).sort((a, b) => change(a.pose) - change(b.pose))[0] ?? null
  const other = options.find((o) => o !== best) ?? null
  return { best, other }
}

/** Time (s) for a cubic move: set by the joint that turns most, at about maxSpeed rad/s,
 *  so a long swing takes longer than a small step (kept between minTime and maxTime). */
export function moveDuration(from: Pose, to: Pose, maxSpeed: number, minTime: number, maxTime: number): number {
  const turn = Math.max(Math.abs(to.t1 - from.t1), Math.abs(to.t2 - from.t2))
  return Math.min(maxTime, Math.max(minTime, turn / maxSpeed))
}

/** Design shown first: the shortest with coverage >= 95%, else the first on the front. */
export function defaultDesign(front: Design[]): number {
  let pick = -1
  front.forEach((d, i) => {
    if (d.coverage >= 0.95 && (pick === -1 || d.length < front[pick].length)) pick = i
  })
  return pick === -1 ? 0 : pick
}
