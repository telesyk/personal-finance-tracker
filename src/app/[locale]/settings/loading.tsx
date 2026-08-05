export default function SettingsLoading() {
  return (
    <main className="w-full sm:max-w-lg sm:mx-auto p-4 sm:p-8 space-y-6">
      <div className="h-7 w-24 rounded bg-muted animate-pulse" />

      <section className="space-y-2">
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        <div className="rounded-lg border px-4 py-3 space-y-1.5">
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        </div>
      </section>

      <section className="space-y-2">
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        <div className="rounded-lg border divide-y">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
