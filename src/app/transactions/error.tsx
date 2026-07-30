'use client'

import { ErrorPage } from '@/components/error-page'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <ErrorPage error={error} retry={unstable_retry} />
}
