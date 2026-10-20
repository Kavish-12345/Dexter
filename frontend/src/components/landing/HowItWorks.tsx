import type { ReactNode } from 'react'

// "How it works": the whole pipeline on one screen, as four connected steps with small illustrations,
// and the robotics each step relies on.

const ORANGE = '#F97316'
const INK = '#1C1917'
const MUTED = '#d6d3d1'

// --- step illustrations (tiny SVGs, 120 x 80) ---

function TaskArt() {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      {Array.from({ length: 13 }, (_, i) => (
        <line key={`v${i}`} x1={i * 10} y1={0} x2={i * 10} y2={80} stroke="#f0efed" />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 10} x2={120} y2={i * 10} stroke="#f0efed" />
      ))}
      <rect x={50} y={14} width={50} height={40} fill={ORANGE} fillOpacity={0.15} stroke={ORANGE} strokeWidth={2} rx={2} />
      {Array.from({ length: 5 }, (_, i) =>
        Array.from({ length: 4 }, (_, j) => <circle key={`${i}${j}`} cx={58 + i * 8.5} cy={22 + j * 8.5} r={1.6} fill={ORANGE} />),
      )}
      <circle cx={22} cy={66} r={4} fill={INK} />
      <path d="M78 64 l8 0 m-4 -4 l0 8" stroke={INK} strokeWidth={0} />
    </svg>
  )
}

function CheckArt() {
  // one target, the two IK solutions (elbow up solid, elbow down faint)
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      <circle cx={20} cy={64} r={4.5} fill={INK} />
      <polyline points="20,64 52,22 92,40" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="20,64 64,70 92,40" fill="none" stroke={MUTED} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 7" />
      <circle cx={52} cy={22} r={3} fill="#fff" stroke={INK} strokeWidth={1.5} />
      <circle cx={92} cy={40} r={5} fill="none" stroke={ORANGE} strokeWidth={2} />
      <circle cx={92} cy={40} r={1.6} fill={ORANGE} />
      <text x={56} y={14} fontSize={9} fill="#78716c" fontFamily="JetBrains Mono, monospace">θ2</text>
    </svg>
  )
}

function OptimizeArt() {
  // a cloud of designs and the Pareto front highlighted
  const cloud = [[18, 30], [28, 50], [34, 22], [44, 58], [50, 40], [62, 64], [70, 48], [80, 66], [90, 58], [58, 30], [76, 36]]
  const front = [[16, 66], [30, 60], [46, 50], [62, 38], [80, 26], [100, 18]]
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      <line x1={8} y1={72} x2={112} y2={72} stroke={MUTED} />
      <line x1={8} y1={72} x2={8} y2={6} stroke={MUTED} />
      {cloud.map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x + 10} cy={y - 6} r={2.6} fill={MUTED} />
      ))}
      <polyline points={front.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={ORANGE} strokeWidth={1.5} strokeDasharray="3 3" />
      {front.map(([x, y]) => (
        <circle key={`f${x}`} cx={x} cy={y} r={3.2} fill={ORANGE} />
      ))}
    </svg>
  )
}

function ExploreArt() {
  // an arm with the curved tool path of a joint-space cubic move
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      <path d="M86 18 C 104 34, 102 56, 80 66" fill="none" stroke={ORANGE} strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={30} cy={60} r={9} fill="#f5f5f4" stroke={MUTED} />
      <polyline points="30,60 60,30 86,18" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={30} cy={60} r={3.4} fill={ORANGE} />
      <circle cx={60} cy={30} r={3.2} fill="#fff" stroke={INK} strokeWidth={1.5} />
      <circle cx={86} cy={18} r={3} fill={ORANGE} />
      <circle cx={80} cy={66} r={4} fill="none" stroke={ORANGE} strokeWidth={1.5} />
    </svg>
  )
}

interface Step {
  title: string
  text: string
  under: string // the robotics behind the step
  art: ReactNode
}

const STEPS: Step[] = [
  {
    title: 'Define the task',
    text: 'Draw the area the tool must reach, and set the link lengths and joint limits allowed.',
    under: 'Task grid · joint limits',
    art: <TaskArt />,
  },
  {
    title: 'Score every design',
    text: 'For each (l1, l2), inverse kinematics tests every task point with both elbow solutions; the Jacobian rates how far each pose is from a singularity.',
    under: 'FK / IK · det J = l1·l2·sin θ2',
    art: <CheckArt />,
  },
  {
    title: 'Optimize the trade-off',
    text: 'NSGA-II evolves 60 designs for 50 generations and keeps the ones no other design beats on coverage, dexterity and size: the Pareto front.',
    under: 'NSGA-II · Pareto front',
    art: <OptimizeArt />,
  },
  {
    title: 'Explore in 3D',
    text: 'Pick a design from the front, see its workspace and dexterity, and send its tool to any task point along smooth joint trajectories.',
    under: 'Cubic joint trajectories',
    art: <ExploreArt />,
  },
]

function Fade({ delay, children, className = '' }: { delay: number; children: ReactNode; className?: string }) {
  return (
    <div className={`fade-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

export default function HowItWorks({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

      {/* one screen, no scrolling: the content is centred in the space under the header */}
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.07),transparent_55%)]" />
        <div className="relative m-auto w-full max-w-[88rem] px-8 pt-6 pb-16">
          <Fade delay={0} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">How it works</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 lg:text-4xl">
                From a task to the right arm, <span className="text-orange-500">in four steps.</span>
              </h1>
            </div>
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-none bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)] ring-1 ring-orange-700 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-[0_14px_28px_-8px_rgba(0,0,0,0.5)] active:translate-y-0 active:shadow-[0_4px_10px_-4px_rgba(0,0,0,0.45)]"
            >
              Start designing <span aria-hidden>→</span>
            </button>
          </Fade>

          {/* the pipeline: numbered nodes on a line, one card per step */}
          <div className="relative mt-8">
            <div className="absolute left-0 right-0 top-4 hidden h-px bg-linear-to-r from-orange-300 via-stone-300 to-orange-300 md:block" />
            <div className="grid gap-4 md:grid-cols-4">
              {STEPS.map((s, i) => (
                <Fade key={s.title} delay={120 + i * 110}>
                  <div className="relative flex h-full flex-col">
                    <span className="relative z-10 mb-3 grid h-8 w-8 place-items-center rounded-full bg-orange-500 font-mono text-xs font-bold text-white shadow-md shadow-orange-500/30 ring-4 ring-stone-50">
                      {i + 1}
                    </span>
                    <div className="flex flex-1 flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-900/5">
                      <div className="h-24 overflow-hidden rounded-xl bg-stone-50 ring-1 ring-stone-100">{s.art}</div>
                      <h3 className="mt-3 font-bold text-stone-900">{s.title}</h3>
                      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-stone-600">{s.text}</p>
                      <span className="mt-3 self-start rounded-md bg-stone-900 px-2 py-1 font-mono text-[10px] text-stone-100">{s.under}</span>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
