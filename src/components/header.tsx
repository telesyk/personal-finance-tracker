import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './sign-out-button'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <header className="border-b px-4 py-2 flex items-center justify-between">
      <span className="font-heading text-sm font-semibold tracking-wide">Finance Tracker</span>
      <SignOutButton />
    </header>
  )
}
