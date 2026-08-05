// Root path — the next-intl middleware redirects / to /{locale}/ automatically.
// This page is a fallback for edge cases where middleware does not run
// (e.g. static export or direct server rendering without a proxy).
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/en')
}
