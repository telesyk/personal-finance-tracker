'use client'

export default function OfflinePage() {
  return (
    <main className="max-w-lg mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <p className="text-4xl" aria-hidden>📡</p>
      <h1 className="font-heading text-xl font-semibold">You're offline</h1>
      <p className="text-sm text-muted-foreground">
        No internet connection. Previously visited pages are still available — go back or try again when you're connected.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
      >
        Try again
      </button>
    </main>
  )
}
