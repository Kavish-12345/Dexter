import { Html, Line } from '@react-three/drei'
import { useMemo, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import type { Pose } from '../../lib/arm'
import { BODY, COLORS, DARK } from './scene'

// Robot frame axes in scene coordinates: x -> +x, y -> -z (away from the viewer), z (joint axis) -> up.
const X_AXIS = new THREE.Vector3(1, 0, 0)
const Y_AXIS = new THREE.Vector3(0, 0, -1)
const Z_AXIS = new THREE.Vector3(0, 1, 0)
const frameChip = 'pointer-events-none rounded bg-stone-900/85 px-1 font-mono text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/40'

// A text label attached to a point in the scene. Its stacking order is capped so menus and overlays
// on the page always draw above it (drei's default puts labels above everything).
function Label({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  return (
    <Html position={position} center zIndexRange={[10, 0]}>
      {children}
    </Html>
  )
}

// A coordinate frame like in the textbook: x red, y green, z blue (z is the vertical joint axis).
function Frame({ size, lift, label }: { size: number; lift: number; label: string }) {
  const origin = useMemo(() => new THREE.Vector3(0, lift, 0), [lift])
  const head = size * 0.18
  return (
    <group>
      <arrowHelper args={[X_AXIS, origin, size, '#ef4444', head, head * 0.6]} />
      <arrowHelper args={[Y_AXIS, origin, size, '#22c55e', head, head * 0.6]} />
      <arrowHelper args={[Z_AXIS, origin, size * 0.6, '#3b82f6', head, head * 0.6]} />
      <Label position={[-size * 0.25, lift, size * 0.25]}>
        <span className={frameChip}>{label}</span>
      </Label>
    </group>
  )
}

interface Props {
  L1: number // scene units
  L2: number
  k: number // overall size (reach in scene units), for proportions
  height: number // height of the links above the table
  pose: Pose // starting pose (main arm) or fixed pose (ghost)
  joint1?: RefObject<THREE.Group | null>
  joint2?: RefObject<THREE.Group | null>
  ghost?: 'ok' | 'bad'
  labels?: { j1: ReactNode; j2: ReactNode; l1: ReactNode; l2: ReactNode; tool: ReactNode }
  frames?: { arc1: THREE.Line; arc2: THREE.Line } | null
}

// The arm. Joint groups are nested, so link 2 rides on link 1: the scene graph is the forward
// kinematics. Rotating a group about the vertical axis by theta is turning that joint.
export default function Robot(props: Props) {
  const { L1, L2, k, height, ghost, labels, frames } = props
  const mat = (look: typeof BODY) =>
    ghost ? (
      <meshStandardMaterial color={ghost === 'ok' ? '#a8a29e' : COLORS.missed} transparent opacity={0.25} depthWrite={false} />
    ) : (
      <meshStandardMaterial {...look} />
    )
  const ring = (r: number, y: number) =>
    !ghost && (
      <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 1.02, r * 0.09, 12, 48]} />
        <meshStandardMaterial color={COLORS.accent} emissive={COLORS.accent} emissiveIntensity={0.6} />
      </mesh>
    )
  const hr = 0.09 * k // joint housing radius
  const hh = 0.14 * k // joint housing height
  const tool = height - 0.02 * k // tool reaches down to just above the table
  const lift = hh / 2 + 0.03 * k // frames drawn just above the arm
  const fs = 0.22 * k // frame arrow length

  return (
    <group position={[0, height, 0]}>
      {frames && (
        <>
          <Frame size={fs * 1.15} lift={lift} label="{0}" />
          <primitive object={frames.arc1} />
        </>
      )}
      {labels && <Label position={[-0.2 * k, 0.12 * k, 0]}>{labels.j1}</Label>}

      <group ref={props.joint1} rotation={[0, props.pose.t1, 0]}>
        {/* shoulder (J1) */}
        <mesh>
          <cylinderGeometry args={[hr, hr, hh, 40]} />
          {mat(DARK)}
        </mesh>
        {ring(hr, hh / 2)}
        {/* link 1 */}
        <mesh position={[L1 / 2, 0, 0]}>
          <boxGeometry args={[L1, 0.08 * k, 0.13 * k]} />
          {mat(BODY)}
        </mesh>
        {!ghost && (
          <mesh position={[L1 / 2, 0.041 * k, 0]}>
            <boxGeometry args={[L1 * 0.7, 0.003, 0.025 * k]} />
            <meshStandardMaterial color={COLORS.accent} emissive={COLORS.accent} emissiveIntensity={0.3} />
          </mesh>
        )}
        {labels && <Label position={[L1 / 2, 0.12 * k, 0]}>{labels.l1}</Label>}
        {labels && <Label position={[L1, 0.22 * k, 0]}>{labels.j2}</Label>}
        {frames && (
          <>
            <group position={[0, 0.001, 0]}>
              <Frame size={fs} lift={lift} label="{1}" />
            </group>
            {/* x1 extended past the elbow, so theta2 is the angle from it to x2 */}
            <Line points={[[L1, lift, 0], [L1 + 0.3 * k, lift, 0]]} color="#ef4444" lineWidth={1} dashed dashSize={0.02 * k} gapSize={0.015 * k} />
            <group position={[L1, 0, 0]}>
              <primitive object={frames.arc2} />
            </group>
          </>
        )}

        <group ref={props.joint2} position={[L1, 0, 0]} rotation={[0, props.pose.t2, 0]}>
          {/* elbow (J2) */}
          <mesh>
            <cylinderGeometry args={[hr * 0.85, hr * 0.85, hh * 0.9, 40]} />
            {mat(DARK)}
          </mesh>
          {ring(hr * 0.85, (hh * 0.9) / 2)}
          {/* link 2 */}
          <mesh position={[L2 / 2, 0, 0]}>
            <boxGeometry args={[L2, 0.065 * k, 0.1 * k]} />
            {mat(BODY)}
          </mesh>
          {/* end-effector: wrist and a vertical tool down to the table */}
          <mesh position={[L2, 0, 0]}>
            <cylinderGeometry args={[0.045 * k, 0.045 * k, 0.1 * k, 32]} />
            {mat(DARK)}
          </mesh>
          <mesh position={[L2, -tool / 2, 0]}>
            <cylinderGeometry args={[0.012 * k, 0.012 * k, tool, 16]} />
            {mat(BODY)}
          </mesh>
          {!ghost && (
            <mesh position={[L2, -tool, 0]}>
              <coneGeometry args={[0.022 * k, 0.04 * k, 20]} />
              <meshStandardMaterial color={COLORS.accent} emissive={COLORS.accent} emissiveIntensity={0.6} />
            </mesh>
          )}
          {frames && (
            <>
              <Frame size={fs * 0.85} lift={lift} label="{2}" />
              <group position={[L2, 0, 0]}>
                <Frame size={fs * 0.6} lift={lift} label="{T}" />
              </group>
            </>
          )}
          {labels && <Label position={[L2 / 2, 0.1 * k, 0]}>{labels.l2}</Label>}
          {labels && <Label position={[L2, 0.24 * k, 0]}>{labels.tool}</Label>}
        </group>
      </group>
    </group>
  )
}
