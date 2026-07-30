import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteSection } from './invite-section'
import { cn } from '@/lib/utils'

const CURRENCY_SYMBOL: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', UAH: '₴' }

function currentMonthRange() {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${y}-${pad(m)}-01`
  const to = new Date(y, m, 0).toLocaleDateString('en-CA')
  const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  return { from, to, label }
}

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

  const { from, to, label } = currentMonthRange()

  const [{ data: wallets }, { data: transactions }, { data: recentTxs }] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, currency, balance, is_primary')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('type, amount')
      .gte('date', from)
      .lte('date', to),
    supabase
      .from('transactions')
      .select(`
        id, type, amount, date,
        wallet:wallets!wallet_id(name, currency),
        category:categories(name, icon)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const primaryWallet = wallets?.[0] ?? null
  const totalBalance = (wallets ?? []).reduce((s, w) => s + parseFloat(String(w.balance)), 0)
  const symbol = primaryWallet ? (CURRENCY_SYMBOL[primaryWallet.currency] ?? primaryWallet.currency) : '€'

  const income = (transactions ?? [])
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + parseFloat(String(t.amount)), 0)

  const expenses = (transactions ?? [])
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + parseFloat(String(t.amount)), 0)

  const net = income - expenses

  return (
    <main className="w-full sm:max-w-lg sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6">
      <p className="text-muted-foreground">
        Welcome, <span className="text-foreground font-medium">{profile.display_name ?? user.email}</span>
      </p>

      {/* Primary wallet + all wallets total */}
      {primaryWallet && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {primaryWallet.is_primary ? 'Primary wallet' : 'Main wallet'}
            </p>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {symbol} {parseFloat(String(primaryWallet.balance)).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">{primaryWallet.name}</p>
          </div>
          {(wallets ?? []).length > 1 && (
            <div className="border-t pt-3 flex items-baseline justify-between">
              <p className="text-xs text-muted-foreground">All wallets</p>
              <p className="text-sm font-medium tabular-nums text-muted-foreground">
                {symbol} {totalBalance.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Monthly KPI snapshot */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Full analytics →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border px-3 py-2.5 space-y-0.5">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
              {symbol} {income.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2.5 space-y-0.5">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-500">
              {symbol} {expenses.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2.5 space-y-0.5">
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={cn(
              'text-sm font-semibold tabular-nums',
              net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-500',
            )}>
              {net >= 0 ? '+' : '−'}{symbol} {Math.abs(net).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Last 3 transactions */}
      {(recentTxs ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent transactions</p>
          <div className="rounded-lg border divide-y">
            {(recentTxs ?? []).map((tx: any) => {
              const txSymbol = CURRENCY_SYMBOL[tx.wallet?.currency ?? ''] ?? '€'
              const amt = parseFloat(String(tx.amount)).toFixed(2)
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span aria-hidden>
                      {tx.type === 'transfer' ? '↔' : (tx.category?.icon ?? '•')}
                    </span>
                    <div>
                      <p className="font-medium leading-tight">
                        {tx.type === 'transfer' ? 'Transfer' : (tx.category?.name ?? 'Uncategorised')}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.wallet?.name}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'font-medium tabular-nums',
                    tx.type === 'income' && 'text-green-600 dark:text-green-400',
                    tx.type === 'expense' && 'text-red-600 dark:text-red-500',
                    tx.type === 'transfer' && 'text-muted-foreground',
                  )}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}{txSymbol} {amt}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="text-right">
            <Link href="/transactions" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              All transactions →
            </Link>
          </div>
        </div>
      )}

      {/* Nav links */}
      <div className="flex gap-3 flex-wrap pt-2">
        <Link href="/wallets" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Wallets</Link>
        <span className="text-muted-foreground/30">·</span>
        <Link href="/transactions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Transactions</Link>
        <span className="text-muted-foreground/30">·</span>
        <Link href="/analytics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Analytics</Link>
      </div>

      <InviteSection />
    </main>
  )
}
