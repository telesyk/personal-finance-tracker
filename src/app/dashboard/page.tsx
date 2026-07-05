import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteSection } from './invite-section'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('group_id, display_name')
    .eq('id', user.id)
    .single()

  if (!profile?.group_id) redirect('/onboarding')

  return (
    <main className="flex flex-col gap-6 p-8 max-w-lg mx-auto">
      <p className="text-muted-foreground">
        Welcome, <span className="text-foreground font-medium">{profile.display_name ?? user.email}</span>
      </p>
      <InviteSection />
    </main>
  )
}
