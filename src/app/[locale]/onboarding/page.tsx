import { redirect } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Locale } from '@/i18n/routing'
import { OnboardingForm } from './onboarding-form'

// next-intl v4: redirect() expects { href, locale }, not a bare string.
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect({ href: '/sign-in', locale })

  const { data: profile } = await supabase
    .from('profiles')
    .select('group_id')
    .eq('id', user!.id)
    .single()

  if (profile?.group_id) redirect({ href: '/dashboard', locale })

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <OnboardingForm />
    </main>
  )
}
