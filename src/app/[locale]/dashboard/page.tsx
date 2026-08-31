import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { requireProfile } from '@/lib/auth'
import { currencySymbol } from '@/lib/currency'
import { currentMonthRange, currentMonthStr } from '@/lib/date'
import { DashboardBudgetTabs, type BudgetScopeData } from '@/components/dashboard-budget-tabs'
import { DashboardTopSpending } from '@/components/dashboard-top-spending'

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireProfile()
  const t  = await getTranslations('dashboard')
  const tt = await getTranslations('transactions')

  const { from, to, label } = currentMonthRange()
  const month = currentMonthStr()

  const groupId = profile?.group_id ?? null

  const [
    { data: wallets },
    { data: transactions },
    { data: recentTxs },
    { data: group },
    { data: personalBudgets },
    { data: groupBudgets },
  ] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, currency, balance, is_primary, owner_id, group_id')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('type, amount, category_id, wallet:wallets!wallet_id(owner_id, group_id), category:categories(name, icon)')
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
    // Personal category budgets — current month
    supabase
      .from('budgets')
      .select('category_id, amount')
      .eq('owner_id', user.id)
      .eq('month', month)
      .not('category_id', 'is', null),
    // Group category budgets — current month (owner_id = null means group-scoped)
    groupId
      ? supabase
          .from('budgets')
          .select('category_id, amount')
          .is('owner_id', null)
          .eq('month', month)
          .not('category_id', 'is', null)
      : Promise.resolve({ data: [] }),
  ])

  // ── Wallet helpers ────────────────────────────────────────────────────────────
  const primaryWallet     = wallets?.[0] ?? null
  const totalBalance      = (wallets ?? []).reduce((s, w) => s + parseFloat(String(w.balance)), 0)
  const sharedWallets     = (wallets ?? []).filter(w => w.group_id !== null)
  const sharedWalletsTotal = sharedWallets.reduce((s, w) => s + parseFloat(String(w.balance)), 0)
  const symbol            = primaryWallet ? currencySymbol(primaryWallet.currency) : '€'
  const groupSymbol       = sharedWallets[0] ? currencySymbol(sharedWallets[0].currency) : symbol

  // ── Budget scope builder ───────────────────────────────────────────────────────
  function buildScopeData(
    budgetRows: { category_id: string | null; amount: string | number }[] | null,
    txFilter: (tx: any) => boolean,
    scopeSymbol: string,
  ): BudgetScopeData {
    const bmap: Record<string, number> = {}
    for (const b of budgetRows ?? []) {
      if (b.category_id) bmap[b.category_id] = parseFloat(String(b.amount))
    }
    const overallBudget = Object.keys(bmap).length > 0
      ? Object.values(bmap).reduce((s, v) => s + v, 0)
      : undefined

    const scopeIncome = (transactions ?? [])
      .filter(t => t.type === 'income' && txFilter(t))
      .reduce((s, t) => s + parseFloat(String(t.amount)), 0)
    const scopeExpenses = (transactions ?? [])
      .filter(t => t.type === 'expense' && txFilter(t))
      .reduce((s, t) => s + parseFloat(String(t.amount)), 0)

    const catMap = new Map<string, { key: string; name: string; icon: string | null; total: number }>()
    for (const tx of transactions ?? []) {
      if (tx.type !== 'expense' || !txFilter(tx)) continue
      const key  = (tx as any).category_id ?? '__none__'
      if (key === '__none__') continue
      const name = (tx as any).category?.name ?? 'Uncategorised'
      const icon = (tx as any).category?.icon ?? null
      const prev = catMap.get(key) ?? { key, name, icon, total: 0 }
      catMap.set(key, { ...prev, total: prev.total + parseFloat(String(tx.amount)) })
    }
    const top3 = Array.from(catMap.values()).sort((a, b) => b.total - a.total).slice(0, 3)

    return { income: scopeIncome, expenses: scopeExpenses, overallBudget, budgetMap: bmap, top3, symbol: scopeSymbol }
  }

  const personalData = buildScopeData(
    personalBudgets,
    tx => (tx.wallet as any)?.owner_id === user.id,
    symbol,
  )
  const groupData = groupId ? buildScopeData(
    groupBudgets ?? [],
    tx => (tx.wallet as any)?.group_id !== null,
    groupSymbol,
  ) : null

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

      {/* Primary wallet — compact */}
      {primaryWallet && (
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{primaryWallet.name}</p>
              <p className="font-heading text-2xl font-semibold tabular-nums mt-0.5">
                {symbol} {parseFloat(String(primaryWallet.balance)).toFixed(2)}
              </p>
            </div>
            <Link href="/wallets" className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5">
              {t('allWallets')} →
            </Link>
          </div>
          {((wallets ?? []).length > 1 || (groupId && sharedWallets.length > 0)) && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t flex-wrap">
              {(wallets ?? []).length > 1 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t('allWallets')}{' '}
                  <span className="font-medium text-foreground">{symbol} {totalBalance.toFixed(2)}</span>
                </span>
              )}
              {groupId && sharedWallets.length > 0 && (
                <span className="text-xs tabular-nums text-indigo-600 dark:text-indigo-400">
                  {t('groupWallets')}{' '}
                  <span className="font-medium">{symbol} {sharedWalletsTotal.toFixed(2)}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Monthly KPI + Budget KPI + Top-3 — client island with Personal/Group tabs */}
      <DashboardBudgetTabs
        personalData={personalData}
        groupData={groupData}
        groupId={groupId}
        groupName={group?.name ?? null}
        monthLabel={label}
      />

      {/* Last 3 transactions */}
      {(recentTxs ?? []).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('recentTransactions')}</p>
            <Link href="/transactions" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t('allTransactions')}
            </Link>
          </div>
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
        </div>
      )}

      {/* Top-3 spending — tab-scoped, shown after recent transactions */}
      <DashboardTopSpending
        personalData={personalData}
        groupData={groupData}
        groupId={groupId}
      />

    </main>
  )
}
