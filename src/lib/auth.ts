import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')
  return { supabase, user }
}

export async function requireProfile() {
  const { supabase, user } = await requireUser()
<<<<<<< HEAD
  let { data: profile } = await supabase
=======
  const { data: profile } = await supabase
>>>>>>> origin/main
    .from('profiles')
    .select('group_id, display_name')
    .eq('id', user.id)
    .single()
<<<<<<< HEAD

  // Fallback: trigger may have missed this user (e.g. registered before migration ran)
  if (!profile) {
    const displayName =
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      user.email?.split('@')[0] ||
      'User'
    await supabase.from('profiles').insert({ id: user.id, display_name: displayName })
    const { data } = await supabase
      .from('profiles')
      .select('group_id, display_name')
      .eq('id', user.id)
      .single()
    profile = data
  }

=======
>>>>>>> origin/main
  return { supabase, user, profile }
}
