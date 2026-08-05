export default function Loading() {
  return (
    <div className="w-full sm:max-w-2xl sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 rounded bg-muted" />
        <div className="h-9 w-28 rounded bg-muted" />
      </div>

      {/* Wallet cards */}
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-lg border">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-9 w-9 rounded bg-muted" />
                <div className="h-9 w-9 rounded bg-muted" />
              </div>
            </div>
            <div className="flex items-center justify-between px-6 pb-4">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
