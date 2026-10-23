import type { ReactNode } from 'react'
import DemoArm from './DemoArm'

// Numbers from the brute-force validation (backend/validate.py: the default task and a two-area task,
// seeds 1-10 and 42; every design on the 0.1 cm grid is 51,676 arms per task).
const STATS = [
  { value: '51,676', label: 'designs brute-forced per task, one and two areas' },
  { value: '3', label: 'goals traded off: coverage, dexterity, size' },
  { value: '~2 s', label: 'per optimization run' },
]

function Fade({ delay, children, className = '' }: { delay: number; children: ReactNode; className?: string }) {
  return (
    <div className={`fade-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

const primary =
  'inline-flex items-center gap-2 rounded-none bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)] ring-1 ring-orange-700 transition hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-[0_14px_28px_-8px_rgba(0,0,0,0.5)] active:translate-y-0 active:shadow-[0_4px_10px_-4px_rgba(0,0,0,0.45)]'

// One-screen landing page: the hero, centred in the window, with the live 3D demo.
export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

      {/* one screen, no scrolling: the hero is centred in the space under the header */}
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.08),transparent_55%)]" />
        <div className="relative m-auto grid w-full max-w-[88rem] items-center gap-12 px-8 py-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-7">
            <Fade delay={100}>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-stone-900 lg:text-[3.1rem]">
                Smarter robotic design, <span className="text-orange-500">optimized for your workspace.</span>
              </h1>
            </Fade>
            <Fade delay={200}>
              <p className="max-w-xl text-lg leading-relaxed text-stone-600">
                Multi-objective optimization of a two-link arm: task coverage, dexterity and size, traded off with NSGA-II and
                shown live in 3D.
              </p>
            </Fade>
            <Fade delay={300}>
              <button onClick={onStart} className={primary}>
                Start designing <span aria-hidden>→</span>
              </button>
            </Fade>
            <Fade delay={400} className="grid grid-cols-3 gap-3 pt-2">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-400">
                  <div className="font-mono text-xl font-semibold text-stone-900">{s.value}</div>
                  <div className="mt-1 text-xs leading-snug text-stone-500">{s.label}</div>
                </div>
              ))}
            </Fade>
          </div>

          <Fade delay={200}>
            <div className="relative h-95 overflow-hidden rounded-2xl bg-stone-900 shadow-2xl shadow-stone-900/20 ring-1 ring-stone-800 lg:h-[min(60vh,470px)]">
              <DemoArm />
              <span className="absolute bottom-3 left-3 rounded-md bg-stone-900/80 px-2 py-1 font-mono text-[10px] text-stone-300 ring-1 ring-white/10">
                live · joint-space cubic trajectories
              </span>
            </div>
          </Fade>
        </div>
      </main>
    </div>
  )
}
