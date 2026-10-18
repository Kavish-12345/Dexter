import { Grid, Line, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { ApiError, getWorkspace, solveIk, type Config, type Design, type WorkspaceResult } from '../../api/client'
import { midPose, pickSolution, type Option, type Pose } from '../../lib/arm'
import { show, type Units } from '../../lib/fields'
import Animator from './Animator'
import Robot from './Robot'
import { ARC_POINTS, lineObject, S, TRAIL_MAX, type Motion, type TextKey } from './scene'
import TaskPoints from './TaskPoints'

type Task = WorkspaceResult['task']

const chip = 'pointer-events-none whitespace-nowrap rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-medium ring-1 backdrop-blur-sm'
const button = 'rounded-md bg-slate-900/80 px-2 py-1 text-xs ring-1 ring-slate-700 hover:text-sky-400'

function errorText(e: unknown): string {
  return e instanceof ApiError ? e.messages.join('; ') : String(e)
}

interface Props {
  config: Config // the config the design was optimized with
  design: Design
  units: Units
}

// SCARA-style view of the design: the two-link arm works over a table, the task points lie on the
// table top, and clicking a point sends the tool there along joint-space cubic trajectories.
export default function ArmScene({ config, design, units }: Props) {
  const { l1, l2 } = design
  const [task, setTask] = useState<Task | null>(null)
  const [ghost, setGhost] = useState<Option | null>(null)
  const [target, setTarget] = useState<{ x: number; y: number; ok: boolean } | null>(null)
  const [showFrames, setShowFrames] = useState(true)
  const [message, setMessage] = useState('Click a point on the table to send the tool there.')
  const start = useMemo(() => midPose(config), [config])
  const poseRef = useRef<Pose>(start)
  const motion = useRef<Motion>(null)
  const joint1 = useRef<THREE.Group>(null)
  const joint2 = useRef<THREE.Group>(null)
  const controls = useRef<OrbitControlsImpl>(null)
  const texts = useRef<Record<TextKey, HTMLSpanElement | null>>({ j1: null, j2: null, readout: null, fps: null })
  const trail = useMemo(() => lineObject(TRAIL_MAX, '#38bdf8', 0.9), [])
  const arcs = useMemo(() => ({ arc1: lineObject(ARC_POINTS, '#fbbf24'), arc2: lineObject(ARC_POINTS, '#fbbf24') }), [])

  useEffect(() => {
    getWorkspace(config, l1, l2)
      .then((w) => setTask(w.task))
      .catch((e) => setMessage(errorText(e)))
  }, [config, l1, l2])

  useEffect(() => () => {
    document.body.style.cursor = ''
  }, [])

  async function moveTo(x: number, y: number) {
    try {
      const { solutions } = await solveIk(config, l1, l2, x, y)
      const { best, other } = pickSolution(solutions, poseRef.current, config)
      setGhost(other)
      setTarget({ x, y, ok: best !== null })
      if (best) {
        setMessage(`Target (${show(x, 'length', units)}, ${show(y, 'length', units)}) ${units.length}`)
        motion.current = { from: poseRef.current, to: best.pose, start: performance.now() }
      } else {
        setMessage(other ? 'Reachable, but not within the joint limits (red ghost).' : 'Out of reach.')
      }
    } catch (e) {
      setMessage(errorText(e))
    }
  }

  // Scene sizes, all proportional to the arm's reach.
  const R = l1 + l2
  const k = R * S
  const height = 0.32 * k // links ride this high above the table
  const arcLift = 0.07 * k + 0.03 * k // frames and arcs just above the joint housings
  const [xMin, xMax, yMin, yMax] = config.task_rect.map((v) => v * S)
  const taskCenter = new THREE.Vector3((xMin + xMax) / 2, 0, -(yMin + yMax) / 2)
  const look = taskCenter.clone().multiplyScalar(0.5) // halfway between the base and the task area
  const tableSize = 2.6 * Math.max(k, Math.hypot(taskCenter.x, taskCenter.z) + 0.3 * k)
  const reachCircle = useMemo(
    () => Array.from({ length: 129 }, (_, i) => [k * Math.cos((i / 128) * 2 * Math.PI), 0.004, k * Math.sin((i / 128) * 2 * Math.PI)] as [number, number, number]),
    [k],
  )
  const setText = (key: TextKey) => (el: HTMLSpanElement | null) => {
    texts.current[key] = el
  }

  return (
    <div className="relative h-full w-full">
      <Canvas dpr={[1, 1.5]} camera={{ position: [look.x + 0.2 * k, 1.6 * k, look.z + 2.1 * k], fov: 40, near: 0.01, far: 200 }}>
        <color attach="background" args={['#0b1120']} />
        <fog attach="fog" args={['#0b1120', 4 * k, 9 * k]} />
        <ambientLight intensity={0.5} />
        <hemisphereLight args={['#e0f2fe', '#0f172a', 0.8]} />
        <directionalLight position={[1.2 * k, 3 * k, 1.6 * k]} intensity={2.2} />
        <directionalLight position={[-2 * k, 1.5 * k, -2 * k]} intensity={0.6} color="#7dd3fc" />

        {/* table */}
        <mesh position={[0, -0.03 * k, 0]}>
          <boxGeometry args={[tableSize, 0.06 * k, tableSize]} />
          <meshStandardMaterial color="#111827" roughness={0.85} metalness={0.1} />
        </mesh>
        <Grid position={[0, 0.001, 0]} args={[tableSize, tableSize]} cellSize={0.1} sectionSize={0.5}
          cellColor="#1f2a3d" sectionColor="#2f3f58" fadeDistance={5 * k} />

        {/* task area, reach circle and task points on the table top */}
        <mesh position={[taskCenter.x, 0.002, taskCenter.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[xMax - xMin, yMax - yMin]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.1} />
        </mesh>
        <Line
          points={[[xMin, 0.004, -yMin], [xMax, 0.004, -yMin], [xMax, 0.004, -yMax], [xMin, 0.004, -yMax], [xMin, 0.004, -yMin]]}
          color="#38bdf8"
          lineWidth={1.5}
        />
        <Line points={reachCircle} color="#475569" lineWidth={1} dashed dashSize={0.04 * k} gapSize={0.03 * k} />
        {task && <TaskPoints task={task} r={Math.min(config.grid_spacing * S * 0.2, 0.012 * k)} onPick={(i) => moveTo(task.x[i], task.y[i])} />}

        {/* where the tool is going, and the path it traced */}
        {target && (
          <mesh position={[target.x * S, 0.005, -target.y * S]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.025 * k, 0.035 * k, 32]} />
            <meshBasicMaterial color={target.ok ? '#38bdf8' : '#f87171'} />
          </mesh>
        )}
        <primitive object={trail} />

        {/* base column */}
        <mesh position={[0, 0.02 * k, 0]}>
          <cylinderGeometry args={[0.16 * k, 0.18 * k, 0.04 * k, 48]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, height / 2, 0]}>
          <cylinderGeometry args={[0.07 * k, 0.09 * k, height, 40]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.25} roughness={0.4} />
        </mesh>

        <Robot
          L1={l1 * S}
          L2={l2 * S}
          k={k}
          height={height}
          pose={start}
          joint1={joint1}
          joint2={joint2}
          frames={showFrames ? arcs : null}
          labels={{
            j1: <span ref={setText('j1')} className={`${chip} text-sky-300 ring-sky-500/40`} />,
            j2: <span ref={setText('j2')} className={`${chip} text-sky-300 ring-sky-500/40`} />,
            l1: <span className={`${chip} text-orange-300 ring-orange-500/40`}>L1 {show(l1, 'length', units)} {units.length}</span>,
            l2: <span className={`${chip} text-orange-300 ring-orange-500/40`}>L2 {show(l2, 'length', units)} {units.length}</span>,
            tool: <span className={`${chip} text-slate-200 ring-slate-500/40`}>Tool</span>,
          }}
        />
        {ghost && <Robot L1={l1 * S} L2={l2 * S} k={k} height={height} pose={ghost.pose} ghost={ghost.ok ? 'ok' : 'bad'} />}

        <Animator l1={l1} l2={l2} k={k} arcLift={arcLift} motion={motion} poseRef={poseRef}
          joint1={joint1} joint2={joint2} trail={trail} arcs={arcs} texts={texts} units={units} />
        <OrbitControls ref={controls} makeDefault target={look} enableDamping maxPolarAngle={Math.PI / 2 - 0.05} />
      </Canvas>

      {/* overlays */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-slate-900/80 px-3 py-2 font-mono text-xs text-slate-100 ring-1 ring-slate-700 backdrop-blur-sm">
        <span ref={setText('readout')} />
      </div>
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <span ref={setText('fps')} className="rounded-md bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-slate-400 ring-1 ring-slate-700" />
        <button onClick={() => setShowFrames((s) => !s)} className={`${button} ${showFrames ? 'text-amber-300' : 'text-slate-300'}`}>
          Frames {showFrames ? 'on' : 'off'}
        </button>
        <button onClick={() => controls.current?.reset()} className={`${button} text-slate-300`}>
          Reset view
        </button>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 space-y-1 text-xs">
        {message && <p className="inline-block rounded-md bg-slate-900/80 px-2 py-1 text-slate-200 ring-1 ring-slate-700">{message}</p>}
        <p className="text-[10px] text-slate-400">
          <span className="text-emerald-400">●</span> covered <span className="ml-2 text-red-400">●</span> not covered
          <span className="ml-2 text-sky-400">━</span> tool path · dashed: reach l1 + l2 · ghost: other elbow
          {showFrames && (
            <>
              {' '}· frames <span className="text-red-400">x</span> <span className="text-green-400">y</span> <span className="text-blue-400">z</span> (joint axis),{' '}
              <span className="text-amber-300">arcs</span> θ1 θ2
            </>
          )}{' '}
          · drag to orbit, scroll to zoom
        </p>
      </div>
    </div>
  )
}
