export default function Loading() {
  return (
    <div className="w-full sm:max-w-4xl sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 rounded bg-muted" />
        <div className="h-9 w-9 rounded bg-muted" />
      </div>

      {/* Wallet summary bar */}
      <div className="flex items-center gap-4 text-sm py-1">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-3 w-1 rounded bg-muted" />
        <div className="h-3 w-28 rounded bg-muted" />
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded bg-muted" />
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-7 w-7 rounded bg-muted" />
      </div>

      {/* Transaction rows */}
      <div className="space-y-1">
        <div className="h-3 w-16 rounded bg-muted mb-2" />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
