import { Html, Line, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { ApiError, getWorkspace, solveIk, type Config, type Design, type WorkspaceResult } from '../../api/client'
import { midPose, moveDuration, pickSolution, type Option, type Pose } from '../../lib/arm'
import { show, type Units } from '../../lib/fields'
import { AREA_COLORS, AREA_NAMES, tourStops } from '../../lib/taskArea'
import Animator from './Animator'
import Robot from './Robot'
import { ARC_POINTS, COLORS, JOINT_SPEED, lineObject, MOVE_MAX, MOVE_MIN, S, TOUR_PAUSE, TRAIL_MAX, type Motion, type TextKey } from './scene'
import Stage from './Stage'
import TaskPoints from './TaskPoints'

type Task = WorkspaceResult['task']

// Overlays on the dark viewport: dark glass cards with light text.
const chip = 'pointer-events-none whitespace-nowrap rounded-md bg-stone-900/85 px-1.5 py-0.5 font-mono text-[10px] font-medium ring-1'
const card = 'rounded-lg bg-stone-900/80 ring-1 ring-white/10 backdrop-blur'
const button = `${card} px-2.5 py-1 text-xs font-medium text-stone-300 transition hover:text-white`

const PANEL_COVER = 320 - 48 // px of the canvas the open settings panel covers (w-80 minus the w-12 bar)

// Keeps the scene centred in the part of the canvas the panel does not cover: shifts the camera's
// image sideways (a view offset, no canvas resize), gliding with the panel's slide.
function ViewShift({ panelOpen }: { panelOpen: boolean }) {
  const shift = useRef(panelOpen ? PANEL_COVER / 2 : 0)
  useFrame((state, delta) => {
    const target = panelOpen ? PANEL_COVER / 2 : 0
    shift.current += (target - shift.current) * Math.min(1, delta * 12) // eases in about 0.3 s
    const { width, height } = state.size
    const camera = state.camera as THREE.PerspectiveCamera
    camera.setViewOffset(width, height, -shift.current, 0, width, height)
    camera.updateProjectionMatrix()
  })
  return null
}

function errorText(e: unknown): string {
  return e instanceof ApiError ? e.messages.join('; ') : String(e)
}

interface Props {
  config: Config // the config the design was optimized with
  design: Design
  units: Units
  panelOpen: boolean // settings panel open: keep the scene centred in the uncovered part
}

// SCARA-style view of the design: the two-link arm works over a table, the task points lie on the
// table top, and clicking a point sends the tool there along joint-space cubic trajectories.
export default function ArmScene({ config, design, units, panelOpen }: Props) {
  const { l1, l2 } = design
  const [task, setTask] = useState<Task | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [ghost, setGhost] = useState<Option | null>(null)
  const [target, setTarget] = useState<{ x: number; y: number; ok: boolean } | null>(null)
  const [showFrames, setShowFrames] = useState(true)
  const [showGhost, setShowGhost] = useState(false) // the other IK solution, off by default
  const [message, setMessage] = useState('Click a point on the table to send the tool there.')
  const [touring, setTouring] = useState(false)
  const [order, setOrder] = useState(() => config.task_rects.map((_, a) => a)) // tour order of the areas
  const [dragged, setDragged] = useState<number | null>(null) // position of the chip being dragged
  const tourId = useRef(0) // bumped to stop a running tour
  const start = useMemo(() => midPose(config), [config])
  const poseRef = useRef<Pose>(start)
  const motion = useRef<Motion>(null)
  const joint1 = useRef<THREE.Group>(null)
  const joint2 = useRef<THREE.Group>(null)
  const controls = useRef<OrbitControlsImpl>(null)
  const texts = useRef<Record<TextKey, HTMLSpanElement | null>>({ j1: null, j2: null, readout: null, fps: null })
  const trail = useMemo(() => lineObject(TRAIL_MAX, COLORS.accent, 0.9), [])
  const arcs = useMemo(() => ({ arc1: lineObject(ARC_POINTS, COLORS.arc), arc2: lineObject(ARC_POINTS, COLORS.arc) }), [])

  useEffect(() => {
    getWorkspace(config, l1, l2)
      .then((w) => setTask(w.task))
      .catch((e) => {
        setMessage(errorText(e))
        setLoadFailed(true) // lift the loading cover so the message is visible
      })
  }, [config, l1, l2])

  useEffect(() => () => {
    document.body.style.cursor = ''
    tourId.current += 1 // leaving the scene stops a running tour
  }, [])

  /** Send the tool to (x, y) along a joint-space cubic whose time fits the largest joint turn.
   *  Returns the move time in s, or null if the tool cannot go there. */
  async function moveTo(x: number, y: number, opts: { keepTrail?: boolean; label?: string } = {}) {
    try {
      const { solutions } = await solveIk(config, l1, l2, x, y)
      const { best, other } = pickSolution(solutions, poseRef.current, config)
      setGhost(other)
      setTarget({ x, y, ok: best !== null })
      if (best) {
        const from = poseRef.current
        const duration = moveDuration(from, best.pose, JOINT_SPEED, MOVE_MIN, MOVE_MAX)
        setMessage(`${opts.label ?? 'Target'} (${show(x, 'length', units)}, ${show(y, 'length', units)}) ${units.length}`)
        motion.current = { from, to: best.pose, start: performance.now(), duration, keepTrail: opts.keepTrail }
        return duration
      }
      setMessage(other ? 'Reachable, but not within the joint limits.' : 'Out of reach.')
    } catch (e) {
      setMessage(errorText(e))
    }
    return null
  }

  function stopTour() {
    tourId.current += 1
    setTouring(false)
  }

  // Tour: visit one point in every area this arm reaches, in the chosen order and back to the first,
  // each move a joint-space cubic. The trail is kept for the whole tour so the path stays visible.
  async function runTour() {
    if (!task) return
    const byArea = new Map(tourStops(task, config.task_rects).map((s) => [s.area, s]))
    const stops = order.filter((a) => byArea.has(a)).map((a) => byArea.get(a)!)
    if (stops.length < 2) {
      setMessage('The tour needs at least two areas this arm can reach.')
      return
    }
    const id = ++tourId.current
    setTouring(true)
    const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000))
    for (const [i, stop] of [...stops, stops[0]].entries()) {
      if (tourId.current !== id) return // stopped, or a new tour started
      const time = await moveTo(stop.x, stop.y, { keepTrail: i > 0, label: `Tour: area ${AREA_NAMES[stop.area]}` })
      if (time === null) break
      await wait(time + TOUR_PAUSE)
    }
    if (tourId.current === id) setTouring(false)
  }

  // Scene sizes, all proportional to the arm's reach.
  const R = l1 + l2
  const k = R * S
  const height = 0.32 * k // links ride this high above the table
  const arcLift = 0.1 * k // frames and arcs just above the joint housings
  const areas = config.task_rects.map((r) => r.map((v) => v * S)) // scene units
  const n = areas.length
  // look halfway between the base and the middle of the task areas
  const look = new THREE.Vector3(
    areas.reduce((a, [x1, x2]) => a + (x1 + x2) / 2, 0) / n,
    0,
    -areas.reduce((a, [, , y1, y2]) => a + (y1 + y2) / 2, 0) / n,
  ).multiplyScalar(0.5)
  // D: size of what must be in view (the reach circle, or a task area if it is farther out).
  const D = Math.max(k, ...areas.flatMap(([x1, x2, y1, y2]) => [[x1, y1], [x2, y1], [x1, y2], [x2, y2]].map(([x, y]) => Math.hypot(x, y))))
  const tableSize = 2.3 * D
  const camera: [number, number, number] = [look.x + 0.15 * D, 1.15 * D, look.z + 1.45 * D]
  const reachCircle = useMemo(
    () => Array.from({ length: 129 }, (_, i) => [k * Math.cos((i / 128) * 2 * Math.PI), 0.004, k * Math.sin((i / 128) * 2 * Math.PI)] as [number, number, number]),
    [k],
  )
  const setText = (key: TextKey) => (el: HTMLSpanElement | null) => {
    texts.current[key] = el
  }

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: COLORS.background }}>
      {/* The canvas keeps the full width it has with the settings panel collapsed (window minus the 48 px
          bar), anchored to the right. Opening the panel just covers its left part, so the canvas never
          resizes and the scene never shifts while the panel slides. */}
      <div className="absolute inset-y-0 right-0" style={{ width: 'calc(100vw - 3rem)' }}>
      <Canvas dpr={[1, 1.5]} camera={{ position: camera, fov: 40, near: 0.01, far: 200 }}>
        <Stage k={k} height={height} tableSize={tableSize} view={D} />

        {/* task areas (one colour each), reach circle and task points on the table top */}
        {areas.map(([xMin, xMax, yMin, yMax], a) => (
          <group key={a}>
            <mesh position={[(xMin + xMax) / 2, 0.002, -(yMin + yMax) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[xMax - xMin, yMax - yMin]} />
              <meshBasicMaterial color={AREA_COLORS[a]} transparent opacity={0.06} />
            </mesh>
            <Line
              points={[[xMin, 0.004, -yMin], [xMax, 0.004, -yMin], [xMax, 0.004, -yMax], [xMin, 0.004, -yMax], [xMin, 0.004, -yMin]]}
              color={AREA_COLORS[a]}
              lineWidth={1.5}
            />
            {n > 1 && (
              <Html position={[xMin, 0.01, -yMax]} center zIndexRange={[10, 0]}>
                <span className={`${chip} font-bold ring-white/15`} style={{ color: AREA_COLORS[a] }}>
                  {AREA_NAMES[a]}
                </span>
              </Html>
            )}
          </group>
        ))}
        <Line points={reachCircle} color={COLORS.reach} lineWidth={1} dashed dashSize={0.04 * k} gapSize={0.03 * k} />
        {task && <TaskPoints task={task} r={Math.min(config.grid_spacing * S * 0.2, 0.012 * k)} onPick={(i) => {
          stopTour()
          moveTo(task.x[i], task.y[i])
        }} />}

        {/* where the tool is going, and the path it traced */}
        {target && (
          <mesh position={[target.x * S, 0.005, -target.y * S]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.025 * k, 0.035 * k, 32]} />
            <meshBasicMaterial color={target.ok ? COLORS.accent : COLORS.missed} />
          </mesh>
        )}
        <primitive object={trail} />

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
            j1: <span ref={setText('j1')} className={`${chip} text-stone-100 ring-white/15`} />,
            j2: <span ref={setText('j2')} className={`${chip} text-stone-100 ring-white/15`} />,
            l1: <span className={`${chip} text-orange-300 ring-orange-500/40`}>L1 {show(l1, 'length', units)} {units.length}</span>,
            l2: <span className={`${chip} text-orange-300 ring-orange-500/40`}>L2 {show(l2, 'length', units)} {units.length}</span>,
            tool: <span className={`${chip} text-stone-100 ring-white/15`}>Tool</span>,
          }}
        />
        {showGhost && ghost && <Robot L1={l1 * S} L2={l2 * S} k={k} height={height} pose={ghost.pose} ghost={ghost.ok ? 'ok' : 'bad'} />}

        <Animator l1={l1} l2={l2} k={k} arcLift={arcLift} motion={motion} poseRef={poseRef}
          joint1={joint1} joint2={joint2} trail={trail} arcs={arcs} texts={texts} units={units} />
        <OrbitControls ref={controls} makeDefault target={look} enableDamping maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={0.35 * D} maxDistance={4.2 * D} />
        <ViewShift panelOpen={panelOpen} />
      </Canvas>
      </div>

      {/* overlays */}
      <div className={`pointer-events-none absolute left-4 top-4 px-3 py-2 font-mono text-xs text-stone-100 ${card}`}>
        <span ref={setText('readout')} />
      </div>
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <span ref={setText('fps')} className={`px-2 py-1 font-mono text-[10px] text-stone-400 ${card}`} />
        <button onClick={() => setShowFrames((s) => !s)} className={`${button} ${showFrames ? 'text-orange-400!' : ''}`}>
          Frames {showFrames ? 'on' : 'off'}
        </button>
        <button
          onClick={() => setShowGhost((s) => !s)}
          title="Show the other IK solution (the mirror elbow) for the last target"
          className={`${button} ${showGhost ? 'text-orange-400!' : ''}`}
        >
          Other elbow {showGhost ? 'on' : 'off'}
        </button>
        <button onClick={() => controls.current?.reset()} className={button}>
          Reset view
        </button>
      </div>
      {/* tour, bottom right (only with several task areas): drag the chips to change the order */}
      {n > 1 && (
        <div className={`absolute bottom-4 right-4 z-10 flex items-center gap-2 p-1.5 ${card}`}>
          <div className="flex items-center gap-0.5 pl-1" title="Drag to change the tour order">
            {order.map((a, i) => (
              <span key={a} className="flex items-center gap-0.5">
                {i > 0 && <span className="text-[11px] text-stone-600">›</span>}
                <span
                  draggable={!touring}
                  onDragStart={() => setDragged(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragged === null || dragged === i) return
                    const next = [...order]
                    next.splice(i, 0, next.splice(dragged, 1)[0])
                    setOrder(next)
                  }}
                  onDragEnd={() => setDragged(null)}
                  className={`grid h-6 w-6 place-items-center rounded font-mono text-[11px] font-bold ring-1 ring-white/15 transition ${
                    touring ? '' : 'cursor-grab hover:ring-white/40 active:cursor-grabbing'
                  } ${dragged === i ? 'opacity-40' : ''}`}
                  style={{ color: AREA_COLORS[a] }}
                >
                  {AREA_NAMES[a]}
                </span>
              </span>
            ))}
          </div>
          <button
            onClick={touring ? stopTour : runTour}
            disabled={!task}
            title={`Move the tool through the areas in this order and back to ${AREA_NAMES[order[0]]}`}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40 ${
              touring ? 'bg-stone-700 hover:bg-stone-600' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {touring ? '■ Stop' : '▶ Tour'}
          </button>
        </div>
      )}

      <div className={`pointer-events-none absolute bottom-4 left-4 space-y-1.5 text-xs ${n > 1 ? 'right-72' : ''}`}>
        {message && <p className={`inline-block px-2.5 py-1 text-stone-100 ${card}`}>{message}</p>}
        <p className="text-[11px] text-stone-400">
          <span className="text-emerald-400">●</span> covered <span className="ml-2 text-rose-400">●</span> not covered
          <span className="ml-2 text-orange-400">━</span> tool path · dashed circle: reach of this arm (l1 + l2 ={' '}
          <span className="font-mono text-stone-200">{show(R, 'length', units)} {units.length}</span>){showGhost && ' · ghost: other elbow'}
          {showFrames && (
            <>
              {' '}· frames <span className="text-red-400">x</span> <span className="text-green-400">y</span> <span className="text-blue-400">z</span> (joint axis),{' '}
              <span className="text-amber-300">arcs</span> θ1 θ2
            </>
          )}{' '}
          · drag to orbit, scroll to zoom
        </p>
      </div>

      {/* loading cover: hides the scene while a newly chosen design builds, then fades out */}
      <div
        className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-500 ${
          task || loadFailed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundColor: COLORS.background }}
      >
        <div className="flex items-center gap-3 text-sm text-stone-300">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          Loading design…
        </div>
      </div>
    </div>
  )
}
