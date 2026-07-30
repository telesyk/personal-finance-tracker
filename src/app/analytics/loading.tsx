export default function Loading() {
  return (
    <div className="w-full sm:max-w-3xl sm:mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 animate-pulse">
      {/* Header + month nav */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 rounded bg-muted" />
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-muted" />
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-7 w-7 rounded bg-muted" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-lg border p-3 sm:p-4 space-y-2">
            <div className="h-3 w-14 rounded bg-muted" />
            <div className="h-5 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Category chart */}
      <div className="space-y-3">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="rounded-lg border p-4 space-y-3">
          {[80, 65, 50, 35, 20].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-24 rounded bg-muted shrink-0" />
              <div className="h-4 rounded bg-muted" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Wallet list */}
      <div className="space-y-3">
        <div className="h-4 w-28 rounded bg-muted" />
        {[0, 1].map(i => (
          <div key={i} className="rounded-lg border p-4 flex items-center justify-between">
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
