import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import type * as THREE from 'three'
import { forwardKinematics, type Pose } from '../../lib/arm'
import type { Units } from '../../lib/fields'
import { cubic } from '../../lib/trajectory'
import { fromRad } from '../../lib/units'
import { ARC_POINTS, MOVE_TIME, S, TRAIL_MAX, type Motion, type TextKey } from './scene'

function angle(rad: number, units: Units): string {
  const v = fromRad(rad, units.angle)
  return units.angle === 'deg' ? `${v.toFixed(1)}°` : `${v.toFixed(3)} rad`
}

interface Props {
  l1: number // cm
  l2: number
  k: number
  arcLift: number // height of the theta arcs above the links
  motion: RefObject<Motion>
  poseRef: RefObject<Pose>
  joint1: RefObject<THREE.Group | null>
  joint2: RefObject<THREE.Group | null>
  trail: THREE.Line
  arcs: { arc1: THREE.Line; arc2: THREE.Line }
  texts: RefObject<Record<TextKey, HTMLSpanElement | null>>
  units: Units
}

// Runs every frame inside the render loop: advances the cubic trajectory, turns the joints,
// draws the tool path on the table and the theta arcs, and updates the readouts.
// Nothing here re-renders React.
export default function Animator(props: Props) {
  const frames = useRef({ n: 0, t: 0 })
  const trailState = useRef({ start: -1, count: 0 })

  useFrame((_, delta) => {
    const { k } = props
    const m = props.motion.current
    if (m) {
      const t = (performance.now() - m.start) / 1000
      const p = { t1: cubic(m.from.t1, m.to.t1, MOVE_TIME, t), t2: cubic(m.from.t2, m.to.t2, MOVE_TIME, t) }
      props.poseRef.current = p

      // trail: the path the tool tip traces on the table during this move
      const ts = trailState.current
      if (ts.start !== m.start) {
        ts.start = m.start
        ts.count = 0
      }
      if (ts.count < TRAIL_MAX) {
        const { hand } = forwardKinematics(p.t1, p.t2, props.l1, props.l2)
        const pos = props.trail.geometry.getAttribute('position') as THREE.BufferAttribute
        pos.setXYZ(ts.count, hand.x * S, 0.006, -hand.y * S)
        ts.count += 1
        pos.needsUpdate = true
        props.trail.geometry.setDrawRange(0, ts.count)
      }
      if (t >= MOVE_TIME) props.motion.current = null
    }

    const p = props.poseRef.current
    if (props.joint1.current) props.joint1.current.rotation.y = p.t1
    if (props.joint2.current) props.joint2.current.rotation.y = p.t2

    // theta arcs (horizontal): theta1 from x0 to x1 at the shoulder, theta2 from x1 to x2 at the elbow
    const drawArc = (line: THREE.Line, theta: number, radius: number) => {
      const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < ARC_POINTS; i++) {
        const a = (theta * i) / (ARC_POINTS - 1)
        pos.setXYZ(i, radius * Math.cos(a), props.arcLift, -radius * Math.sin(a))
      }
      pos.needsUpdate = true
      line.geometry.setDrawRange(0, ARC_POINTS)
    }
    drawArc(props.arcs.arc1, p.t1, 0.17 * k)
    drawArc(props.arcs.arc2, p.t2, 0.14 * k)

    const tx = props.texts.current
    const a1 = angle(p.t1, props.units)
    const a2 = angle(p.t2, props.units)
    if (tx.j1) tx.j1.textContent = `J1 θ1 ${a1}`
    if (tx.j2) tx.j2.textContent = `J2 θ2 ${a2}`
    if (tx.readout) tx.readout.textContent = `θ1 ${a1}   θ2 ${a2}   |s2| ${Math.abs(Math.sin(p.t2)).toFixed(3)}`

    const f = frames.current
    f.n += 1
    f.t += delta
    if (f.t >= 0.5) {
      if (tx.fps) tx.fps.textContent = `${Math.round(f.n / f.t)} fps`
      f.n = 0
      f.t = 0
    }
  })
  return null
}
