import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { requireProfile } from '@/lib/auth'
import { currencySymbol } from '@/lib/currency'
import { currentMonthRange, currentMonthStr } from '@/lib/date'

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireProfile()
  const t  = await getTranslations('dashboard')
  const ta = await getTranslations('analytics')
  const tb = await getTranslations('budget')
  const tt = await getTranslations('transactions')

  const { from, to, label } = currentMonthRange()
  const month = currentMonthStr()

  const groupId = profile?.group_id ?? null

  const [{ data: wallets }, { data: transactions }, { data: recentTxs }, { data: group }, { data: budgets }] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, currency, balance, is_primary, group_id')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('type, amount, category_id, wallet:wallets!wallet_id(owner_id), category:categories(name, icon)')
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
    groupId
      ? supabase.from('groups').select('name').eq('id', groupId).single()
      : Promise.resolve({ data: null }),
    // Personal category budgets for current month — used for Budget KPI card
    supabase
      .from('budgets')
      .select('category_id, amount')
      .eq('owner_id', user.id)
      .eq('month', month)
      .not('category_id', 'is', null),
  ])

  const primaryWallet = wallets?.[0] ?? null
  const totalBalance = (wallets ?? []).reduce((s, w) => s + parseFloat(String(w.balance)), 0)
  const sharedWallets = (wallets ?? []).filter(w => w.group_id !== null)
  const sharedWalletsTotal = sharedWallets.reduce((s, w) => s + parseFloat(String(w.balance)), 0)
  const symbol = primaryWallet ? currencySymbol(primaryWallet.currency) : '€'

  const income = (transactions ?? [])
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + parseFloat(String(t.amount)), 0)

  const expenses = (transactions ?? [])
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + parseFloat(String(t.amount)), 0)

  const net = income - expenses

  // Personal expenses only (wallets owned by current user) — for Budget KPI + category breakdown
  const personalExpenses = (transactions ?? [])
    .filter(t => t.type === 'expense' && (t.wallet as any)?.owner_id === user.id)
    .reduce((s, t) => s + parseFloat(String(t.amount)), 0)

  // Budget map: category_id → budget amount (personal scope, current month)
  const budgetMap = new Map<string, number>()
  for (const b of budgets ?? []) {
    if (b.category_id) budgetMap.set(b.category_id, parseFloat(String(b.amount)))
  }
  const overallBudget = budgetMap.size > 0
    ? Array.from(budgetMap.values()).reduce((s, v) => s + v, 0)
    : undefined

  // Top-3 personal expense categories by spend (excludes uncategorised)
  const categoryMap = new Map<string, { key: string; name: string; icon: string | null; total: number }>()
  for (const tx of transactions ?? []) {
    if (tx.type !== 'expense' || (tx.wallet as any)?.owner_id !== user.id) continue
    const key  = (tx as any).category_id ?? '__none__'
    if (key === '__none__') continue
    const name = (tx as any).category?.name ?? 'Uncategorised'
    const icon = (tx as any).category?.icon ?? null
    const prev = categoryMap.get(key) ?? { key, name, icon, total: 0 }
    categoryMap.set(key, { ...prev, total: prev.total + parseFloat(String(tx.amount)) })
  }
  const top3Categories = Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  return (
    <main className="w-full sm:max-w-lg sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div>
        <p className="text-muted-foreground">
          {t('welcome')}, <span className="text-foreground font-medium">{profile?.display_name ?? user.email}</span>
        </p>
        {group?.name && (
          <p className="text-xs text-muted-foreground">{group.name}</p>
        )}
      </div>

      {/* Primary wallet + all wallets total */}
      {primaryWallet && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {primaryWallet.is_primary ? t('primaryWallet') : t('primaryWallet')}
            </p>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {symbol} {parseFloat(String(primaryWallet.balance)).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">{primaryWallet.name}</p>
          </div>
          {(wallets ?? []).length > 1 && (
            <div className="border-t pt-3 flex items-baseline justify-between">
              <Link href="/wallets" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t('allWallets')}</Link>
              <p className="text-sm font-medium tabular-nums text-muted-foreground">
                {symbol} {totalBalance.toFixed(2)}
              </p>
            </div>
          )}
          {groupId && sharedWallets.length > 0 && (
            <div className="border-t pt-3 flex items-baseline justify-between">
              <Link href="/wallets" className="text-xs text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity">{t('groupWallets')}</Link>
              <p className="text-sm font-medium tabular-nums text-indigo-600 dark:text-indigo-400">
                {symbol} {sharedWalletsTotal.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Budget KPI card */}
      {overallBudget != null ? (() => {
        const pct      = Math.round((personalExpenses / overallBudget) * 100)
        const barColor = pct >= 100 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
        return (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {ta('budgetKpi')}
              </p>
              <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {ta('manageBudget')}
              </Link>
            </div>
            <p className={cn(
              'font-heading text-2xl font-semibold tabular-nums',
              pct >= 100 ? 'text-destructive' : 'text-foreground',
            )}>
              {symbol} {personalExpenses.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {symbol}{overallBudget.toFixed(0)}
              </span>
            </p>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className={cn('text-xs', pct >= 100 ? 'text-destructive' : 'text-muted-foreground')}>
              {ta('budgetPct', { pct })}
            </p>
          </div>
        )
      })() : (
        <div className="rounded-lg border p-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {ta('budgetKpi')}
          </p>
          <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('setBudget')}
          </Link>
        </div>
      )}

      {/* Top-3 category budget mini-list — shown only when personal budgets exist */}
      {budgetMap.size > 0 && top3Categories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('topCategories')}
            </p>
            <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t('viewAll')}
            </Link>
          </div>
          <div className="rounded-lg border divide-y">
            {top3Categories.map(cat => {
              const budget   = budgetMap.get(cat.key)
              const pct      = budget != null ? Math.round((cat.total / budget) * 100) : null
              const barColor = pct != null
                ? pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                : 'bg-primary/50'
              return (
                <div key={cat.key} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5 font-medium min-w-0">
                      {cat.icon && <span aria-hidden="true">{cat.icon}</span>}
                      <span className="truncate">{cat.name}</span>
                    </span>
                    {budget != null ? (
                      <span className="text-xs tabular-nums shrink-0 text-muted-foreground">
                        <span className={cn('font-semibold', pct! >= 100 ? 'text-destructive' : 'text-foreground')}>
                          {symbol} {cat.total.toFixed(2)}
                        </span>
                        {' / '}{symbol} {budget.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-xs tabular-nums shrink-0 font-semibold">
                        {symbol} {cat.total.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {budget != null && pct != null && (
                    <>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className={cn('text-[10px]',
                        pct >= 100 ? 'text-destructive' : pct >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                      )}>
                        {pct >= 100
                          ? `⚠ ${tb('overBudget')} · ${pct}%`
                          : pct >= 80
                            ? `${pct}% · ${tb('nearLimit')}`
                            : `${pct}% ${tb('used')}`}
                      </p>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Monthly KPI snapshot */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t('fullAnalytics')}
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border px-3 py-2.5 space-y-0.5">
            <p className="text-xs text-muted-foreground">{ta('income')}</p>
            <p className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
              {symbol} {income.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2.5 space-y-0.5">
            <p className="text-xs text-muted-foreground">{ta('expenses')}</p>
            <p className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-500">
              {symbol} {expenses.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2.5 space-y-0.5">
            <p className="text-xs text-muted-foreground">{ta('net')}</p>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('recentTransactions')}</p>
          <div className="rounded-lg border divide-y">
            {(recentTxs ?? []).map((tx: any) => {
              const txSymbol = currencySymbol(tx.wallet?.currency ?? 'EUR')
              const amt = parseFloat(String(tx.amount)).toFixed(2)
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span aria-hidden>
                      {tx.type === 'transfer' ? '↔' : (tx.category?.icon ?? '•')}
                    </span>
                    <div>
                      <p className="font-medium leading-tight">
                        {tx.type === 'transfer' ? tt('types.transfer') : (tx.category?.name ?? 'Uncategorised')}
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
              {t('allTransactions')}
            </Link>
          </div>
        </div>
      )}

    </main>
  )
}
