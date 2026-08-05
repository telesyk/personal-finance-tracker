import { redirect } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Locale } from '@/i18n/routing'

// next-intl v4: redirect() expects { href, locale }, not a bare string.
// A bare string causes getPathname() to destructure it as an object, yielding
// href=undefined and locale=undefined, which produces '/undefined' + undefined
// = '/undefinedundefined' as the redirect target.
export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  redirect({ href: user ? '/dashboard' : '/sign-in', locale })
}
