import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './sign-out-button'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <header className="border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-heading text-sm font-semibold tracking-wide">
          Finance Tracker
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/wallets" className="hover:text-foreground transition-colors">Wallets</Link>
        </nav>
      </div>
      <SignOutButton />
    </header>
  )
}
