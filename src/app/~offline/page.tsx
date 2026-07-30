import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="w-full sm:max-w-lg sm:mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <p className="text-4xl" aria-hidden>📡</p>
      <h1 className="font-heading text-xl font-semibold">You&apos;re offline</h1>
      <p className="text-sm text-muted-foreground">
        No internet connection. Previously visited pages are still available — go back or try again when you&apos;re connected.
      </p>
      <Link
        href="/"
        className="mt-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
      >
        Go to dashboard
      </Link>
    </main>
  )
}
