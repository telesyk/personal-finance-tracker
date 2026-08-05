import { Link } from '@/i18n/navigation'

/**
 * Locale-aware 404 page.
 * Rendered whenever a route under /[locale]/ is not found — e.g. /en/undefinedundefined.
 * This is a Server Component with no auto-refresh logic; it stays on-screen until
 * the user explicitly navigates away.
 */
export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-4">
      <p className="text-5xl font-heading font-bold text-muted-foreground/30">404</p>
      <p className="text-lg font-semibold">Page not found</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
      >
        Go to dashboard
      </Link>
    </main>
  )
}
