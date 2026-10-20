import type { ReactNode } from 'react'

// Layout for one chart tab: title and a one-line takeaway on top, the chart filling the rest.
export default function ChartCard({ title, note, children, side }: { title: string; note: ReactNode; children: ReactNode; side?: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          <p className="text-xs text-stone-500">{note}</p>
        </div>
        {side}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-stone-200">{children}</div>
    </div>
  )
}

export function Loading({ error }: { error?: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-3 text-sm text-stone-500">
      {error ? (
        <span className="text-rose-600">{error}</span>
      ) : (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /> Loading…
        </>
      )}
    </div>
  )
}
