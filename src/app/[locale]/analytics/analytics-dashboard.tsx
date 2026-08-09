'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTabState } from '@/hooks/use-tab-state'
import { Link, useRouter } from '@/i18n/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import { currencySymbol, parseAmount } from '@/lib/currency'
import { currentMonthStr, monthLabel, prevMonth, nextMonth } from '@/lib/date'
import { TabSwitcher } from '@/components/tab-switcher'
import type { AnalyticsTransaction, AnalyticsBudget } from './page'

interface Wallet {
  id: string
  name: string
  currency: string
  balance: string | number
  is_primary: boolean
  owner_id: string | null
  group_id: string | null
}

interface Props {
  month: string
  transactions: AnalyticsTransaction[]
  wallets: Wallet[]
  groupId: string | null
  groupName: string | null
  currentUserId: string
  budgets: AnalyticsBudget[]
}

export function AnalyticsDashboard({ month, transactions, wallets, groupId, groupName, currentUserId, budgets }: Props) {
  const router = useRouter()
  const t  = useTranslations('analytics')
  const tb = useTranslations('budget')
  const tw = useTranslations('wallets')
  const isCurrentMonth = month === currentMonthStr()
  const { activeTab, changeTab } = useTabState(groupId)

  // ── Scope filters ─────────────────────────────────────────────────────────────

  const visibleTxs = !groupId || activeTab === 'personal'
    ? transactions.filter(t => t.wallet?.owner_id === currentUserId)
    : transactions.filter(t => t.wallet?.group_id !== null)

  const visibleWallets = !groupId || activeTab === 'personal'
    ? wallets.filter(w => w.owner_id === currentUserId)
    : wallets.filter(w => w.group_id !== null)

  const symbol = visibleWallets[0] ? currencySymbol(visibleWallets[0].currency) : '€'

  // ── KPI totals ────────────────────────────────────────────────────────────────

  const income = visibleTxs
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + parseAmount(t.amount), 0)

  const expenses = visibleTxs
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + parseAmount(t.amount), 0)

  const net = income - expenses

  // ── Category breakdown (preserves the map key for budget look-up) ─────────────

  const categoryMap = new Map<string, { key: string; name: string; icon: string | null; total: number }>()
  for (const tx of visibleTxs) {
    if (tx.type !== 'expense') continue
    const key  = tx.category_id ?? '__none__'
    const name = tx.category?.name ?? 'Uncategorised'
    const icon = tx.category?.icon ?? null
    const prev = categoryMap.get(key) ?? { key, name, icon, total: 0 }
    categoryMap.set(key, { ...prev, total: prev.total + parseAmount(tx.amount) })
  }
  const categoryData = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)

  // ── Budget map (scope-filtered) ───────────────────────────────────────────────

  const scopeBudgets = budgets.filter(b =>
    activeTab === 'personal' ? b.owner_id === currentUserId : b.owner_id === null,
  )
  const budgetMap = new Map<string, number>()
  for (const b of scopeBudgets) {
    budgetMap.set(b.category_id ?? '__overall__', parseAmount(b.amount))
  }

  const overallBudget = budgetMap.get('__overall__')

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main className="w-full sm:max-w-3xl sm:mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">

      {/* Header + month nav */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/analytics?month=${prevMonth(month)}`)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-0 text-center">{monthLabel(month)}</span>
          <button
            onClick={() => router.push(`/analytics?month=${nextMonth(month)}`)}
            disabled={isCurrentMonth}
            className={cn(
              'p-1.5 rounded transition-colors',
              isCurrentMonth ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:bg-muted',
            )}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Personal / Group tabs */}
      {groupId && (
        <TabSwitcher
          tabs={[{ value: 'personal', label: t('tabPersonal') }, { value: 'group', label: groupName ? groupName.slice(0, 50) : t('tabGroup') }]}
          active={activeTab}
          onChange={v => changeTab(v as 'personal' | 'group')}
        />
      )}

      {/* KPI cards — 3 tiles; 3rd tile is Budget when an overall budget exists, otherwise Net */}
      <div className="grid grid-cols-3 gap-3">

        {/* Income */}
        <div className="rounded-lg border p-3 sm:p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('income')}</p>
          <p className="font-heading text-base sm:text-xl font-semibold tabular-nums text-green-600 dark:text-green-400">
            {symbol} {income.toFixed(2)}
          </p>
        </div>

        {/* Expenses */}
        <div className="rounded-lg border p-3 sm:p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('expenses')}</p>
          <p className="font-heading text-base sm:text-xl font-semibold tabular-nums text-red-600 dark:text-red-500">
            {symbol} {expenses.toFixed(2)}
          </p>
        </div>

        {/* Net OR Overall budget */}
        {overallBudget != null ? (() => {
          const pct      = Math.round((expenses / overallBudget) * 100)
          const barColor = pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
          return (
            <div className="rounded-lg border p-3 sm:p-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('budgetKpi')}</p>
              <p className={cn(
                'font-heading text-base sm:text-xl font-semibold tabular-nums',
                pct >= 100 ? 'text-destructive' : 'text-foreground',
              )}>
                {symbol} {expenses.toFixed(2)}
                <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                  /{symbol}{overallBudget.toFixed(0)}
                </span>
              </p>
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div className={cn('h-full rounded-full', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <p className={cn('text-[10px]', pct >= 100 ? 'text-destructive' : 'text-muted-foreground')}>
                {t('budgetPct', { pct })}
              </p>
            </div>
          )
        })() : (
          <div className="rounded-lg border p-3 sm:p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('net')}</p>
            <p className={cn(
              'font-heading text-base sm:text-xl font-semibold tabular-nums',
              net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-500',
            )}>
              {net >= 0 ? '+' : '−'}{symbol} {Math.abs(net).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Wallet summary */}
      <div className="space-y-3">
        <h2 className="font-heading text-base font-semibold">{t('walletSummary')}</h2>
        {visibleWallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {activeTab === 'group' ? tw('emptyGroup') : t('noWallets')}
          </p>
        ) : (
          <div className="rounded-lg border divide-y">
            {visibleWallets.map(w => {
              const s = currencySymbol(w.currency)
              return (
                <div key={w.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{w.name}</span>
                    {w.is_primary && (
                      <span className="text-xs px-1.5 py-0.5 rounded border border-primary/40 text-primary bg-primary/10">
                        {tw('primary')}
                      </span>
                    )}
                  </div>
                  <span className="font-medium tabular-nums">
                    {s} {parseAmount(w.balance).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* vs. budget — per-category actual vs limit; "set one →" CTA for unbudgeted categories */}
      {categoryData.filter(c => c.key !== '__none__').length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading text-base font-semibold">{t('budgetTracking')}</h2>
          <div className="rounded-lg border divide-y">
            {categoryData
              .filter(c => c.key !== '__none__')
              .map(cat => {
                const budget = budgetMap.get(cat.key)
                const pct    = budget != null ? Math.round((cat.total / budget) * 100) : null
                const barColor   = pct != null
                  ? pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  : 'bg-primary'
                const labelClass = pct != null
                  ? pct >= 100 ? 'text-destructive' : pct >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                  : 'text-muted-foreground'

                return (
                  <div key={cat.key} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 font-medium min-w-0">
                        {cat.icon && <span aria-hidden="true">{cat.icon}</span>}
                        <span className="truncate">{cat.name}</span>
                      </span>
                      {budget != null ? (
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          <span className={cn('font-semibold', pct! >= 100 ? 'text-destructive' : 'text-foreground')}>
                            {symbol} {cat.total.toFixed(2)}
                          </span>
                          {' / '}
                          {symbol} {budget.toFixed(2)}
                        </span>
                      ) : (
                        <Link
                          href="/budget"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          {t('setBudget')}
                        </Link>
                      )}
                    </div>

                    {budget != null && (
                      <>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', barColor)}
                            style={{ width: `${Math.min(pct!, 100)}%` }}
                          />
                        </div>
                        <p className={cn('text-xs', labelClass)}>
                          {pct! >= 100
                            ? `⚠ ${tb('overBudget')} · ${pct}%`
                            : pct! >= 80
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

      {/* Category bar chart */}
      <div className="space-y-3">
        <h2 className="font-heading text-base font-semibold">{t('categoryBreakdown')}</h2>
        {categoryData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('noExpenses')}</p>
        ) : (
          <div className="rounded-lg border p-4">
            <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 44)}>
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${symbol}${v}`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(name, i) => {
                    const icon = categoryData[i]?.icon
                    return icon ? `${icon} ${name}` : name
                  }}
                />
                <Tooltip
                  formatter={(value) => [`${symbol} ${Number(value).toFixed(2)}`, 'Amount']}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill="hsl(var(--primary))" fillOpacity={1 - i * 0.06} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pt-2">
        <Link href="/transactions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← All transactions
        </Link>
      </div>

    </main>
  )
}
