import { Grid } from '@react-three/drei'
import { BODY, COLORS, DARK } from './scene'

// The dark "studio" around the arm: background, lights, a charcoal table with its grid, and the base
// column. The rest of the app stays light; only the 3D viewport is dark so the white robot stands out.
// `view` is the size of what is framed (defaults to the reach k); fog starts well beyond the
// farthest the camera may zoom out (4.2 x view, set on the orbit controls), so the scene never fades out.
export default function Stage({ k, height, tableSize, view = k }: { k: number; height: number; tableSize: number; view?: number }) {
  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.background, 4.6 * view, 10 * view]} />
      <ambientLight intensity={0.6} />
      <hemisphereLight args={['#ffffff', '#292524', 0.8]} />
      <directionalLight position={[1.2 * k, 3 * k, 1.6 * k]} intensity={2.2} />
      <directionalLight position={[-2 * k, 1.5 * k, -2 * k]} intensity={0.6} color="#fed7aa" />

      {/* table */}
      <mesh position={[0, -0.03 * k, 0]}>
        <boxGeometry args={[tableSize, 0.06 * k, tableSize]} />
        <meshStandardMaterial color={COLORS.table} roughness={0.9} metalness={0.05} />
      </mesh>
      <Grid position={[0, 0.001, 0]} args={[tableSize, tableSize]} cellSize={0.1} sectionSize={0.5}
        cellColor={COLORS.gridCell} sectionColor={COLORS.gridSection} fadeDistance={4 * k} />

      {/* base column */}
      <mesh position={[0, 0.02 * k, 0]}>
        <cylinderGeometry args={[0.16 * k, 0.18 * k, 0.04 * k, 48]} />
        <meshStandardMaterial {...DARK} />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.07 * k, 0.09 * k, height, 40]} />
        <meshStandardMaterial {...BODY} />
      </mesh>
    </>
  )
}
