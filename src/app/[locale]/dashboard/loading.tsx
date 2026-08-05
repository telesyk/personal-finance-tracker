export default function Loading() {
  return (
    <div className="w-full sm:max-w-lg sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6 animate-pulse">
      {/* Welcome line */}
      <div className="h-4 w-48 rounded bg-muted" />

      {/* Primary wallet card */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-8 w-36 rounded bg-muted" />
          <div className="h-3 w-28 rounded bg-muted" />
        </div>
        <div className="border-t pt-3 flex items-baseline justify-between">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </div>

      {/* KPI strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-lg border px-3 py-2.5 space-y-1.5">
              <div className="h-3 w-12 rounded bg-muted" />
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="rounded-lg border divide-y">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              </div>
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
