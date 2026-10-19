// Shared settings and helpers for the 3D arm scenes (app and landing demo).
// SCARA-style: the robot's x-y plane is the table top. Robot (x, y) in cm -> scene (x * S, height, -y * S),
// and the joints turn about the vertical scene axis.
import * as THREE from 'three'
import type { Pose } from '../../lib/arm'

export const S = 0.1 // scene units per cm (1 unit = 10 cm)
export const MOVE_TIME = 1.0 // s for one cubic move
export const TRAIL_MAX = 240 // points kept in the tool-path trail
export const ARC_POINTS = 48 // points in each theta arc

export type Motion = { from: Pose; to: Pose; start: number } | null
export type TextKey = 'j1' | 'j2' | 'readout' | 'fps'

// Dark studio viewport inside the light app: charcoal table, white robot shell, graphite joints,
// industrial orange accent; task dots bright enough to read on the dark table.
export const COLORS = {
  background: '#151413',
  table: '#262422',
  gridCell: '#34312e',
  gridSection: '#4a4642',
  accent: '#f97316',
  covered: '#34d399',
  missed: '#fb7185',
  reach: '#78716c',
  arc: '#fbbf24',
}
export const BODY = { color: '#fafaf9', metalness: 0.15, roughness: 0.45 } // white robot shell
export const DARK = { color: '#52525b', metalness: 0.5, roughness: 0.35 } // graphite joints and base

/** A line whose points are filled in later (trail, theta arcs). */
export function lineObject(points: number, color: string, opacity = 1): THREE.Line {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points * 3), 3))
  geometry.setDrawRange(0, 0)
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity }))
}
