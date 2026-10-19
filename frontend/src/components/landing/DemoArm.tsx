import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type * as THREE from 'three'
import { forwardKinematics, type Pose } from '../../lib/arm'
import { cubic } from '../../lib/trajectory'
import Robot from '../arm/Robot'
import { COLORS, lineObject, S, TRAIL_MAX } from '../arm/scene'
import Stage from '../arm/Stage'
import TaskPoints from '../arm/TaskPoints'

// Landing-page demo: a fixed design (16 + 16 cm) moving on its own between preset poses along
// joint-space cubic trajectories. No backend calls, so it starts instantly.
const L1 = 16
const L2 = 16
const MOVE = 1.2 // s per move
const HOLD = 0.5 // s pause at each point
// The demo visits these task points (cm), all inside its dot grid. Joint angles come from the same
// IK as the backend (Craig Eqs. 4.14-4.27, elbow +1), so the tool lands exactly on each point.
const TARGETS = [[12, 20], [20, 12], [8, 24], [22, 22], [14, 10], [18, 26]]

function ik(x: number, y: number): Pose {
  const c2 = (x * x + y * y - L1 * L1 - L2 * L2) / (2 * L1 * L2)
  const s2 = Math.sqrt(1 - c2 * c2)
  const t2 = Math.atan2(s2, c2)
  const t1 = Math.atan2(y, x) - Math.atan2(L2 * s2, L1 + L2 * c2)
  return { t1, t2 }
}

const POSES: Pose[] = TARGETS.map(([x, y]) => ik(x, y))

function Loop({ joint1, joint2, trail }: { joint1: React.RefObject<THREE.Group | null>; joint2: React.RefObject<THREE.Group | null>; trail: THREE.Line }) {
  const state = useRef({ i: 0, start: performance.now(), count: 0 })

  useFrame(() => {
    const s = state.current
    const from = POSES[s.i]
    const to = POSES[(s.i + 1) % POSES.length]
    const t = (performance.now() - s.start) / 1000
    const p = { t1: cubic(from.t1, to.t1, MOVE, t), t2: cubic(from.t2, to.t2, MOVE, t) }
    if (joint1.current) joint1.current.rotation.y = p.t1
    if (joint2.current) joint2.current.rotation.y = p.t2

    if (t <= MOVE && s.count < TRAIL_MAX) {
      const { hand } = forwardKinematics(p.t1, p.t2, L1, L2)
      const pos = trail.geometry.getAttribute('position') as THREE.BufferAttribute
      pos.setXYZ(s.count, hand.x * S, 0.006, -hand.y * S)
      s.count += 1
      pos.needsUpdate = true
      trail.geometry.setDrawRange(0, s.count)
    }
    if (t >= MOVE + HOLD) {
      s.i = (s.i + 1) % POSES.length
      s.start = performance.now()
      s.count = 0
    }
  })
  return null
}

export default function DemoArm() {
  const joint1 = useRef<THREE.Group>(null)
  const joint2 = useRef<THREE.Group>(null)
  const trail = useMemo(() => lineObject(TRAIL_MAX, COLORS.accent, 0.9), [])
  const k = (L1 + L2) * S
  const height = 0.32 * k

  // The demo's task grid (all reachable); every target above lies on it.
  const task = useMemo(() => {
    const x: number[] = []
    const y: number[] = []
    for (let gx = 4; gx <= 26; gx += 2) {
      for (let gy = 6; gy <= 28; gy += 2) {
        x.push(gx)
        y.push(gy)
      }
    }
    return { x, y, covered: x.map(() => true) }
  }, [])

  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [1.2 * k, 1.5 * k, 1.9 * k], fov: 38 }}>
      <Stage k={k} height={height} tableSize={3 * k} />
      <TaskPoints task={task} r={0.012 * k} />
      <primitive object={trail} />
      <Robot L1={L1 * S} L2={L2 * S} k={k} height={height} pose={POSES[0]} joint1={joint1} joint2={joint2} />
      <Loop joint1={joint1} joint2={joint2} trail={trail} />
      <OrbitControls target={[0.3 * k, 0.15 * k, -0.4 * k]} enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 2 - 0.1} />
    </Canvas>
  )
}
