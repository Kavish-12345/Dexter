import type { ReactNode } from 'react'
import DemoArm from './DemoArm'

// Numbers from the brute-force validation (backend/validate.py, default task, seeds 1-10 and 42).
const STATS = [
  { value: '51,676', label: 'designs checked by brute force' },
  { value: '50%', label: 'of results exactly optimal, misses 0.15 cm away' },
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
  'inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-orange-600'

// One-screen landing page: the hero, centred in the window, with the live 3D demo.
export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-stone-200/70 bg-stone-50/80">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-3">
          <span className="flex items-center gap-2 text-base font-bold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-stone-900 text-xs text-white">D</span>
            Dexter
          </span>
        </div>
      </header>

      <main className="relative flex flex-1 items-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.08),transparent_55%)]" />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Fade delay={100}>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-stone-900 lg:text-5xl">
                Design the right robot arm, <span className="text-orange-500">not just the biggest one.</span>
              </h1>
            </Fade>
            <Fade delay={200}>
              <p className="max-w-lg text-lg leading-relaxed text-stone-600">
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
                <div key={s.label} className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
                  <div className="font-mono text-lg font-semibold text-stone-900">{s.value}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-stone-500">{s.label}</div>
                </div>
              ))}
            </Fade>
          </div>

          <Fade delay={200}>
            <div className="relative h-95 overflow-hidden rounded-2xl bg-stone-900 shadow-2xl shadow-stone-900/20 ring-1 ring-stone-800 lg:h-110">
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
