export default function Loading() {
  return (
    <div className="w-full sm:max-w-2xl sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 rounded bg-muted" />
        <div className="h-8 w-16 rounded bg-muted" />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b pb-0">
        <div className="h-9 w-24 rounded-t bg-muted" />
        <div className="h-9 w-24 rounded-t bg-muted/50" />
      </div>

      {/* Budget rows */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-lg border px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-36 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted" />
            <div className="h-3 w-16 rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  )
}
