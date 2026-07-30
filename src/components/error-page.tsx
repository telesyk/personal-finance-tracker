'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {error.digest ? `Error ID: ${error.digest}` : 'An unexpected error occurred. Please try again.'}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={retry}>Try again</Button>
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
