import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('group_id')
    .eq('id', user.id)
    .single()

  if (profile?.group_id) redirect('/dashboard')

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <OnboardingForm />
    </main>
  )
}
