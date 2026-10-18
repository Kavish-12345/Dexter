import { useEffect, useRef, useState } from 'react'
import { ApiError, getWorkspace, solveIk, type Config, type Design, type WorkspaceResult } from '../api/client'
import { forwardKinematics, midPose, pickSolution, type Option, type Pose } from '../lib/arm'
import { show, type Units } from '../lib/fields'
import { cubic } from '../lib/trajectory'

const MOVE_TIME = 1.0 // s for one cubic move

interface Props {
  config: Config // the config the design was optimized with
  design: Design
  units: Units
}

// One arm drawn with SVG lines; jointR is the joint dot radius in cm.
function Arm({ pose, l1, l2, color, opacity, jointR }: { pose: Pose; l1: number; l2: number; color: string; opacity: number; jointR: number }) {
  const { elbow, hand } = forwardKinematics(pose.t1, pose.t2, l1, l2)
  return (
    <g stroke={color} fill={color} opacity={opacity} strokeLinecap="round">
      <line x1={0} y1={0} x2={elbow.x} y2={elbow.y} strokeWidth={8} vectorEffect="non-scaling-stroke" />
      <line x1={elbow.x} y1={elbow.y} x2={hand.x} y2={hand.y} strokeWidth={6} vectorEffect="non-scaling-stroke" />
      <circle cx={0} cy={0} r={jointR * 1.4} />
      <circle cx={elbow.x} cy={elbow.y} r={jointR} />
      <circle cx={hand.x} cy={hand.y} r={jointR * 0.8} />
    </g>
  )
}

export default function RobotCanvas({ config, design, units }: Props) {
  const { l1, l2 } = design
  const [task, setTask] = useState<WorkspaceResult['task'] | null>(null)
  const [pose, setPose] = useState<Pose>(() => midPose(config))
  const [ghost, setGhost] = useState<Option | null>(null)
  const [message, setMessage] = useState('Click a task point to move the arm there.')
  const poseRef = useRef<Pose>(pose) // current pose, read when a new move starts
  const frame = useRef<number | null>(null)

  // Task points with covered flags (green / red), for this design and config.
  useEffect(() => {
    getWorkspace(config, l1, l2)
      .then((w) => setTask(w.task))
      .catch((e) => setMessage(e instanceof ApiError ? e.messages.join('; ') : String(e)))
  }, [config, l1, l2])

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  }, [])

  // Both joints follow their own cubic from the current pose to the target over MOVE_TIME.
  function animate(to: Pose) {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    const from = poseRef.current
    const start = performance.now()
    const step = (now: number) => {
      const t = (now - start) / 1000
      const p = { t1: cubic(from.t1, to.t1, MOVE_TIME, t), t2: cubic(from.t2, to.t2, MOVE_TIME, t) }
      poseRef.current = p
      setPose(p)
      frame.current = t < MOVE_TIME ? requestAnimationFrame(step) : null
    }
    frame.current = requestAnimationFrame(step)
  }

  async function moveTo(x: number, y: number) {
    try {
      const { solutions } = await solveIk(config, l1, l2, x, y)
      const { best, other } = pickSolution(solutions, poseRef.current, config)
      setGhost(other)
      if (best) {
        setMessage('')
        animate(best.pose)
      } else {
        setMessage(other ? 'Reachable, but not within the joint limits (red ghost).' : 'Out of reach.')
      }
    } catch (e) {
      setMessage(e instanceof ApiError ? e.messages.join('; ') : String(e))
    }
  }

  const R = l1 + l2
  const pad = R * 0.1
  const [xMin, xMax, yMin, yMax] = config.task_rect
  const dot = R / 150

  return (
    <div className="space-y-2">
      <svg
        viewBox={`${-R - pad} ${-R - pad} ${2 * (R + pad)} ${2 * (R + pad)}`}
        className="h-[480px] w-full max-w-[480px] rounded border border-gray-200 bg-white"
      >
        <g transform="scale(1,-1)">
          {/* y points up, like the robot's frame {0} */}
          <circle r={R} fill="none" stroke="#d1d5db" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <line x1={-R} y1={0} x2={R} y2={0} stroke="#f3f4f6" vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={-R} x2={0} y2={R} stroke="#f3f4f6" vectorEffect="non-scaling-stroke" />
          <rect x={xMin} y={yMin} width={xMax - xMin} height={yMax - yMin} fill="#eff6ff" stroke="#93c5fd" vectorEffect="non-scaling-stroke" />
          {task?.x.map((x, i) => (
            <circle
              key={i}
              cx={x}
              cy={task.y[i]}
              r={dot}
              fill={task.covered[i] ? '#16a34a' : '#dc2626'}
              className="cursor-pointer"
              onClick={() => moveTo(x, task.y[i])}
            />
          ))}
          {ghost && <Arm pose={ghost.pose} l1={l1} l2={l2} color={ghost.ok ? '#9ca3af' : '#dc2626'} opacity={0.35} jointR={dot * 2} />}
          <Arm pose={pose} l1={l1} l2={l2} color="#1d4ed8" opacity={1} jointR={dot * 2} />
        </g>
      </svg>
      <p className="text-sm">
        θ1 = {show(pose.t1, 'angle', units)} {units.angle}, θ2 = {show(pose.t2, 'angle', units)} {units.angle}, dexterity |s2| ={' '}
        {Math.abs(Math.sin(pose.t2)).toFixed(3)}
      </p>
      <p className="text-xs text-gray-500">
        Green: covered task point, red: not covered. Dashed circle: max reach l1 + l2. Grey ghost: the other elbow solution.
      </p>
      {message && <p className="text-sm text-gray-700">{message}</p>}
    </div>
  )
}
