// Joint-space cubic trajectory (Craig Ch. 7): theta(t) = a0 + a1 t + a2 t^2 + a3 t^3.
// With theta(0) = theta0, theta(tf) = thetaf and zero joint velocity at both ends:
//   a0 = theta0, a1 = 0, a2 = 3 (thetaf - theta0) / tf^2, a3 = -2 (thetaf - theta0) / tf^3.
export function cubic(theta0: number, thetaf: number, tf: number, t: number): number {
  const s = Math.min(Math.max(t, 0), tf) // hold the end poses outside 0..tf
  const d = thetaf - theta0
  return theta0 + ((3 * d) / tf ** 2) * s ** 2 - ((2 * d) / tf ** 3) * s ** 3
}
