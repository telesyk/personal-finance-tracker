import { redirect } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LocaleRootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/dashboard' : '/sign-in')
}
