import type { ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import type { WorkspaceResult } from '../../api/client'
import { COLORS, S } from './scene'

type Task = WorkspaceResult['task']

// Task points as small flat discs on the table (green: covered, red: not), all drawn in one GPU
// call (instancing). Click one to send the tool there.
export default function TaskPoints({ task, r, onPick }: { task: Task; r: number; onPick?: (i: number) => void }) {
  const mesh = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const matrix = new THREE.Matrix4()
    const flat = new THREE.Matrix4().makeRotationX(-Math.PI / 2)
    const color = new THREE.Color()
    task.x.forEach((x, i) => {
      matrix.makeTranslation(x * S, 0.003, -task.y[i] * S).multiply(flat)
      m.setMatrixAt(i, matrix)
      m.setColorAt(i, color.set(task.covered[i] ? COLORS.covered : COLORS.missed))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [task])

  return (
    <instancedMesh
      key={task.x.length}
      ref={mesh}
      args={[undefined, undefined, task.x.length]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (!onPick) return
        e.stopPropagation()
        if (e.instanceId !== undefined) onPick(e.instanceId)
      }}
      onPointerOver={() => onPick && (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <circleGeometry args={[r, 16]} />
      <meshBasicMaterial transparent opacity={0.9} />
    </instancedMesh>
  )
}
