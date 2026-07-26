import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
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

  // Primary wallet: prefer is_primary = true, fall back to oldest by created_at.
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, currency, balance, is_primary')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  const primaryWallet = wallets?.[0] ?? null

  const CURRENCY_SYMBOL: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', UAH: '₴' }
  const symbol = primaryWallet ? (CURRENCY_SYMBOL[primaryWallet.currency] ?? primaryWallet.currency) : null
  const balance = primaryWallet ? parseFloat(String(primaryWallet.balance)).toFixed(2) : null

  return (
    <main className="flex flex-col gap-6 p-8 max-w-lg mx-auto">
      <p className="text-muted-foreground">
        Welcome, <span className="text-foreground font-medium">{profile.display_name ?? user.email}</span>
      </p>

      {primaryWallet && (
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {primaryWallet.is_primary ? 'Primary wallet' : 'Main wallet'}
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums">
            {symbol} {balance}
          </p>
          <p className="text-sm text-muted-foreground">{primaryWallet.name}</p>
        </div>
      )}

      <Button asChild variant="outline" className="w-fit">
        <Link href="/wallets">Go to Wallets</Link>
      </Button>
      <Button asChild variant="outline" className="w-fit">
        <Link href="/transactions">Go to Transactions</Link>
      </Button>
      <InviteSection />
    </main>
  )
}
