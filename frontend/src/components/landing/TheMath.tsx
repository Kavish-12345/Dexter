import { useState, type ReactNode } from 'react'

// "The math": an explainer. Pick a topic on the left; the right shows its equations, a plain-language
// note and a small diagram drawn for that topic. One screen, no scrolling.

const ORANGE = '#F97316'
const INK = '#1C1917'
const SOFT = '#d6d3d1'
const GREEN = '#10b981'
const RED = '#f43f5e'

// ---------- shared drawing helpers (diagram space 0..260 x 0..200, y up from the base) ----------

const O = { x: 46, y: 168 } // base on screen
const L1 = 92
const L2 = 70
const rad = (d: number) => (d * Math.PI) / 180

/** Screen points of shoulder, elbow and tool for joint angles in degrees (FK, Eqs. 4.10-4.11). */
function fk(t1: number, t2: number) {
  const e = { x: O.x + L1 * Math.cos(rad(t1)), y: O.y - L1 * Math.sin(rad(t1)) }
  const p = { x: e.x + L2 * Math.cos(rad(t1 + t2)), y: e.y - L2 * Math.sin(rad(t1 + t2)) }
  return { e, p }
}

/** Arc from angle a0 to a1 (degrees, counter-clockwise on screen) around c. */
function arc(c: { x: number; y: number }, r: number, a0: number, a1: number) {
  const p0 = { x: c.x + r * Math.cos(rad(a0)), y: c.y - r * Math.sin(rad(a0)) }
  const p1 = { x: c.x + r * Math.cos(rad(a1)), y: c.y - r * Math.sin(rad(a1)) }
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0
  const sweep = a1 > a0 ? 0 : 1
  return `M${p0.x} ${p0.y} A${r} ${r} 0 ${large} ${sweep} ${p1.x} ${p1.y}`
}

function Arm({ t1, t2, ghost = false, dashed = false }: { t1: number; t2: number; ghost?: boolean; dashed?: boolean }) {
  const { e, p } = fk(t1, t2)
  const c = ghost ? SOFT : INK
  return (
    <g opacity={ghost ? 0.9 : 1}>
      <line x1={O.x} y1={O.y} x2={e.x} y2={e.y} stroke={c} strokeWidth={ghost ? 3 : 7} strokeLinecap="round" strokeDasharray={dashed ? '2 7' : undefined} />
      <line x1={e.x} y1={e.y} x2={p.x} y2={p.y} stroke={ghost ? SOFT : ORANGE} strokeWidth={ghost ? 3 : 6} strokeLinecap="round"
        strokeDasharray={dashed ? '2 7' : undefined} />
      {!ghost && (
        <>
          <circle cx={e.x} cy={e.y} r={4.5} fill="#fff" stroke={INK} strokeWidth={2} />
          <circle cx={p.x} cy={p.y} r={4} fill={ORANGE} />
        </>
      )}
    </g>
  )
}

function Base() {
  return (
    <>
      <rect x={O.x - 16} y={O.y + 4} width={32} height={8} rx={2} fill={INK} />
      <circle cx={O.x} cy={O.y} r={6} fill="#fff" stroke={INK} strokeWidth={2.5} />
    </>
  )
}

const label = 'font-mono text-[11px]'

function Axes() {
  return (
    <g stroke={SOFT} strokeWidth={1}>
      <line x1={O.x} y1={O.y} x2={250} y2={O.y} />
      <line x1={O.x} y1={O.y} x2={O.x} y2={12} />
    </g>
  )
}

// ---------- one diagram per topic ----------

function FkArt() {
  const t1 = 32
  const t2 = 58
  const { e, p } = fk(t1, t2)
  const ext = { x: e.x + 40 * Math.cos(rad(t1)), y: e.y - 40 * Math.sin(rad(t1)) }
  return (
    <svg viewBox="0 0 260 200" className="h-full w-full">
      <Axes />
      <line x1={p.x} y1={p.y} x2={p.x} y2={O.y} stroke={SOFT} strokeDasharray="3 3" />
      <line x1={p.x} y1={p.y} x2={O.x} y2={p.y} stroke={SOFT} strokeDasharray="3 3" />
      <line x1={e.x} y1={e.y} x2={ext.x} y2={ext.y} stroke={SOFT} strokeDasharray="3 3" />
      <path d={arc(O, 30, 0, t1)} fill="none" stroke={ORANGE} strokeWidth={1.5} />
      <path d={arc(e, 22, t1, t1 + t2)} fill="none" stroke={ORANGE} strokeWidth={1.5} />
      <Arm t1={t1} t2={t2} />
      <Base />
      <text x={O.x + 34} y={O.y - 8} className={label} fill={ORANGE}>θ₁</text>
      <text x={e.x + 18} y={e.y - 22} className={label} fill={ORANGE}>θ₂</text>
      <text x={(O.x + e.x) / 2 - 2} y={(O.y + e.y) / 2 - 10} className={label} fill={INK}>l₁</text>
      <text x={(e.x + p.x) / 2 - 18} y={(e.y + p.y) / 2 - 4} className={label} fill={INK}>l₂</text>
      <text x={p.x + 8} y={p.y - 6} className={label} fill={INK}>(x, y)</text>
      <text x={244} y={O.y + 14} className={label} fill="#a8a29e">x</text>
      <text x={O.x - 14} y={18} className={label} fill="#a8a29e">y</text>
    </svg>
  )
}

function IkArt() {
  const t1 = 30
  const t2 = 60
  const { p } = fk(t1, t2)
  // the mirror solution: same tool point, theta2 negated (Eq. 4.15's minus sign)
  const x = (p.x - O.x) / 1
  const y = (O.y - p.y) / 1
  const t2b = -t2
  const t1b = (Math.atan2(y, x) - Math.atan2(L2 * Math.sin(rad(t2b)), L1 + L2 * Math.cos(rad(t2b)))) * (180 / Math.PI)
  return (
    <svg viewBox="0 0 260 200" className="h-full w-full">
      <Axes />
      <Arm t1={t1b} t2={t2b} ghost dashed />
      <Arm t1={t1} t2={t2} />
      <Base />
      <circle cx={p.x} cy={p.y} r={10} fill="none" stroke={ORANGE} strokeWidth={1.5} />
      <text x={p.x + 14} y={p.y + 4} className={label} fill={INK}>target</text>
      <text x={fk(t1, t2).e.x - 30} y={fk(t1, t2).e.y - 10} className={label} fill={INK}>elbow +</text>
      <text x={fk(t1b, t2b).e.x + 6} y={fk(t1b, t2b).e.y + 18} className={label} fill="#a8a29e">elbow −</text>
    </svg>
  )
}

function JacobianArt() {
  const t1 = 30
  const t2 = 62
  const { e, p } = fk(t1, t2)
  // tool velocity from each joint: perpendicular to the line from that joint to the tool
  const v = (from: { x: number; y: number }, len: number) => {
    const dx = p.x - from.x
    const dy = p.y - from.y
    const n = Math.hypot(dx, dy)
    return { x: p.x + (dy / n) * len, y: p.y - (dx / n) * len }
  }
  const v1 = v(O, 42)
  const v2 = v(e, 30)
  return (
    <svg viewBox="0 0 260 200" className="h-full w-full">
      <defs>
        <marker id="math-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={INK} />
        </marker>
      </defs>
      <Axes />
      <Arm t1={6} t2={0} ghost />
      <text x={200} y={O.y - 22} className={label} fill="#a8a29e">straight: det J = 0</text>
      <Arm t1={t1} t2={t2} />
      <Base />
      <line x1={p.x} y1={p.y} x2={v1.x} y2={v1.y} stroke={INK} strokeWidth={1.8} markerEnd="url(#math-arrow)" />
      <line x1={p.x} y1={p.y} x2={v2.x} y2={v2.y} stroke={ORANGE} strokeWidth={1.8} markerEnd="url(#math-arrow)" />
      <text x={v1.x - 34} y={v1.y - 4} className={label} fill={INK}>θ̇₁</text>
      <text x={v2.x + 4} y={v2.y + 4} className={label} fill={ORANGE}>θ̇₂</text>
    </svg>
  )
}

function DexterityArt() {
  // w = |sin theta2| for theta2 from 0 to 180 deg
  const X0 = 34
  const X1 = 244
  const Y0 = 168
  const H = 130
  const pts = Array.from({ length: 61 }, (_, i) => {
    const t = (i / 60) * 180
    return `${X0 + ((X1 - X0) * t) / 180},${Y0 - H * Math.abs(Math.sin(rad(t)))}`
  }).join(' ')
  const mid = X0 + (X1 - X0) / 2
  return (
    <svg viewBox="0 0 260 200" className="h-full w-full">
      <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={SOFT} />
      <line x1={X0} y1={Y0} x2={X0} y2={Y0 - H - 10} stroke={SOFT} />
      <polyline points={pts} fill="none" stroke={ORANGE} strokeWidth={2.5} />
      <line x1={mid} y1={Y0} x2={mid} y2={Y0 - H} stroke={SOFT} strokeDasharray="3 3" />
      <circle cx={mid} cy={Y0 - H} r={4} fill={ORANGE} />
      <circle cx={X0} cy={Y0} r={4} fill={RED} />
      <circle cx={X1} cy={Y0} r={4} fill={RED} />
      <text x={mid - 22} y={Y0 - H - 8} className={label} fill={INK}>w = 1 best</text>
      <text x={X0 - 6} y={Y0 + 16} className={label} fill={RED}>0°</text>
      <text x={X1 - 14} y={Y0 + 16} className={label} fill={RED}>180°</text>
      <text x={mid - 10} y={Y0 + 16} className={label} fill="#78716c">90°</text>
      <text x={X0 + 6} y={Y0 - 8} className={label} fill={RED}>singular</text>
      <text x={X1 - 26} y={22} className={label} fill="#a8a29e">θ₂</text>
    </svg>
  )
}

function ObjectivesArt() {
  const R = L1 + L2 - 30
  const dots: { x: number; y: number; ok: boolean }[] = []
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 5; j++) {
      const x = 120 + i * 20
      const y = 40 + j * 20
      dots.push({ x, y, ok: Math.hypot(x - O.x, O.y - y) <= R })
    }
  }
  return (
    <svg viewBox="0 0 260 200" className="h-full w-full">
      <path d={arc(O, R, 0, 90)} fill="none" stroke="#a8a29e" strokeDasharray="4 4" />
      <rect x={110} y={30} width={120} height={100} fill={ORANGE} fillOpacity={0.08} stroke={ORANGE} strokeWidth={1.5} rx={3} />
      {dots.map((d) => (
        <circle key={`${d.x},${d.y}`} cx={d.x} cy={d.y} r={3.2} fill={d.ok ? GREEN : RED} />
      ))}
      <Base />
      <text x={O.x + 6} y={40} className={label} fill="#78716c">reach l₁ + l₂</text>
      <text x={150} y={150} className={label} fill={INK}>task area</text>
    </svg>
  )
}

function CubicArt() {
  const X0 = 34
  const X1 = 244
  const Yb = 160
  const Yt = 40
  const pts = Array.from({ length: 61 }, (_, i) => {
    const t = i / 60
    const th = 3 * t * t - 2 * t * t * t // normalised cubic with zero end velocities
    return `${X0 + (X1 - X0) * t},${Yb - (Yb - Yt) * th}`
  }).join(' ')
  return (
    <svg viewBox="0 0 260 200" className="h-full w-full">
      <line x1={X0} y1={Yb + 10} x2={X1} y2={Yb + 10} stroke={SOFT} />
      <line x1={X0} y1={Yb + 10} x2={X0} y2={22} stroke={SOFT} />
      <line x1={X0} y1={Yt} x2={X1} y2={Yt} stroke={SOFT} strokeDasharray="3 3" />
      <line x1={X0} y1={Yb} x2={X1} y2={Yb} stroke={SOFT} strokeDasharray="3 3" />
      <polyline points={pts} fill="none" stroke={ORANGE} strokeWidth={2.5} />
      <line x1={X0} y1={Yb} x2={X0 + 36} y2={Yb} stroke={INK} strokeWidth={2} />
      <line x1={X1 - 36} y1={Yt} x2={X1} y2={Yt} stroke={INK} strokeWidth={2} />
      <text x={X0 + 6} y={Yb - 8} className={label} fill={INK}>θ₀ · flat</text>
      <text x={X1 - 60} y={Yt - 8} className={label} fill={INK}>θf · flat</text>
      <text x={X1 - 14} y={Yb + 24} className={label} fill="#a8a29e">t</text>
      <text x={X0 - 18} y={30} className={label} fill="#a8a29e">θ</text>
    </svg>
  )
}

// ---------- topics ----------

const sub = (n: string) => <sub className="text-[0.7em]">{n}</sub>
const sq = <sup className="text-[0.65em]">2</sup>
const cube = <sup className="text-[0.65em]">3</sup>

interface Topic {
  title: string
  eqs: ReactNode[]
  note: string
  art: ReactNode
}

const TOPICS: Topic[] = [
  {
    title: 'Forward kinematics',
    eqs: [
      <>x = l{sub('1')}c{sub('1')} + l{sub('2')}c{sub('12')}</>,
      <>y = l{sub('1')}s{sub('1')} + l{sub('2')}s{sub('12')}</>,
    ],
    note: 'From joint angles to the tool position: add the two link vectors. Link 2 points along θ1 + θ2 because its angle is measured from link 1.',
    art: <FkArt />,
  },
  {
    title: 'Inverse kinematics',
    eqs: [
      <>c{sub('2')} = (x{sq} + y{sq} − l{sub('1')}{sq} − l{sub('2')}{sq}) / 2l{sub('1')}l{sub('2')}</>,
      <>θ{sub('2')} = Atan2(±√(1 − c{sub('2')}{sq}), c{sub('2')})</>,
      <>θ{sub('1')} = Atan2(y, x) − Atan2(l{sub('2')}s{sub('2')}, l{sub('1')} + l{sub('2')}c{sub('2')})</>,
    ],
    note: 'From a target point back to joint angles. Reachable only if |c2| ≤ 1. The ± gives two elbow poses for the same point; it counts as covered if either one fits the joint limits.',
    art: <IkArt />,
  },
  {
    title: 'Jacobian & singularities',
    eqs: [
      <>ẋ = −(l{sub('1')}s{sub('1')} + l{sub('2')}s{sub('12')}) θ̇{sub('1')} − l{sub('2')}s{sub('12')} θ̇{sub('2')}</>,
      <>ẏ = (l{sub('1')}c{sub('1')} + l{sub('2')}c{sub('12')}) θ̇{sub('1')} + l{sub('2')}c{sub('12')} θ̇{sub('2')}</>,
      <>det J = l{sub('1')}l{sub('2')}s{sub('2')}</>,
    ],
    note: 'J maps joint speeds to tool velocity; each joint pushes the tool sideways to the line from that joint. det J = 0 when the arm is straight or folded: the tool cannot move in some direction.',
    art: <JacobianArt />,
  },
  {
    title: 'Dexterity score',
    eqs: [<>w = |det J| / (l{sub('1')}l{sub('2')}) = |s{sub('2')}|</>, <>dexterity = mean w over covered points</>],
    note: 'Our normalisation of det J: 1 when θ2 = ±90° (far from a singularity), 0 when straight or folded. Dividing by l1·l2 stops a bigger arm scoring higher just for its size.',
    art: <DexterityArt />,
  },
  {
    title: 'Objectives & constraints',
    eqs: [
      <>max coverage = mean over areas of (covered / points in the area)</>,
      <>max dexterity · min l{sub('1')} + l{sub('2')}</>,
      <>l{sub('min')} ≤ l{sub('1')}, l{sub('2')} ≤ l{sub('max')} · l{sub('1')} + l{sub('2')} ≤ L{sub('total')}</>,
    ],
    note: 'Three goals that pull against each other: reach more of the task, stay away from singularities, and stay small. Plus a coverage floor that every task area must meet, and joint limits (an angle also counts if θ ± 360° fits).',
    art: <ObjectivesArt />,
  },
  {
    title: 'Cubic joint trajectory',
    eqs: [
      <>θ(t) = θ{sub('0')} + a{sub('2')}t{sq} + a{sub('3')}t{cube}</>,
      <>a{sub('2')} = 3(θ{sub('f')} − θ{sub('0')}) / t{sub('f')}{sq}</>,
      <>a{sub('3')} = −2(θ{sub('f')} − θ{sub('0')}) / t{sub('f')}{cube}</>,
    ],
    note: 'Each joint moves on its own cubic, starting and stopping at zero speed. It never overshoots, so a move between two allowed angles stays inside the joint limits.',
    art: <CubicArt />,
  },
]

export default function TheMath({ onStart }: { onStart: () => void }) {
  const [active, setActive] = useState(0)
  const t = TOPICS[active]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.07),transparent_55%)]" />
        <div className="relative m-auto w-full max-w-[88rem] px-8 py-4">
          <div className="fade-up flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">The math</p>
              <h1 className="mt-1.5 text-[2.125rem] font-extrabold tracking-tight text-stone-900">
                The robotics <span className="text-orange-500">behind every design.</span>
              </h1>
            </div>
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-none bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)] ring-1 ring-orange-700 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-[0_14px_28px_-8px_rgba(0,0,0,0.5)] active:translate-y-0 active:shadow-[0_4px_10px_-4px_rgba(0,0,0,0.45)]"
            >
              Start designing <span aria-hidden>→</span>
            </button>
          </div>

          {/* list and panel fill most of the window height */}
          <div className="fade-up mt-5 grid gap-4 lg:h-[min(60vh,480px)] lg:grid-cols-[290px_1fr]" style={{ animationDelay: '120ms' }}>
            {/* topic list: the six topics share the height evenly */}
            <nav className="flex flex-col gap-1 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-stone-200">
              {TOPICS.map((x, i) => (
                <button
                  key={x.title}
                  onClick={() => setActive(i)}
                  className={`flex flex-1 items-center gap-3 rounded-xl border-l-2 px-4 text-left transition ${
                    i === active ? 'border-orange-500 bg-orange-50 text-stone-900' : 'border-transparent text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-orange-500">0{i + 1}</span>
                  <span className="text-[15.5px] font-semibold">{x.title}</span>
                </button>
              ))}
            </nav>

            {/* selected topic */}
            <section key={active} className="fade-up grid gap-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 md:grid-cols-[1.1fr_1fr]">
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-orange-500">0{active + 1}</span>
                  <h2 className="text-[23px] font-extrabold tracking-tight text-stone-900">{t.title}</h2>
                </div>
                {/* equations: light, with an orange accent line instead of a heavy dark block */}
                <div className="mt-5 space-y-3 border-l-[3px] border-orange-500 py-1 pl-5 font-mono text-[16px] leading-relaxed text-stone-900">
                  {t.eqs.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
                <p className="mt-5 text-[14.5px] leading-relaxed text-stone-600">{t.note}</p>
              </div>
              <div className="flex items-center justify-center rounded-xl bg-stone-50 p-3 ring-1 ring-stone-100">
                <div className="aspect-13/10 w-full max-w-lg">{t.art}</div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
