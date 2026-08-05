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
import type { AnalyticsTransaction } from './page'

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
}

export function AnalyticsDashboard({ month, transactions, wallets, groupId, groupName, currentUserId }: Props) {
  const router = useRouter()
  const t = useTranslations('analytics')
  const tw = useTranslations('wallets')
  const isCurrentMonth = month === currentMonthStr()
  const { activeTab, changeTab } = useTabState(groupId)

  const visibleTxs = !groupId || activeTab === 'personal'
    ? transactions.filter(t => t.wallet?.owner_id === currentUserId)
    : transactions.filter(t => t.wallet?.group_id !== null)

  const visibleWallets = !groupId || activeTab === 'personal'
    ? wallets.filter(w => w.owner_id === currentUserId)
    : wallets.filter(w => w.group_id !== null)

  const symbol = visibleWallets[0] ? currencySymbol(visibleWallets[0].currency) : '€'

  const income = visibleTxs
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + parseAmount(t.amount), 0)

  const expenses = visibleTxs
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + parseAmount(t.amount), 0)

  const net = income - expenses

  const categoryMap = new Map<string, { name: string; icon: string | null; total: number }>()
  for (const tx of visibleTxs) {
    if (tx.type !== 'expense') continue
    const key = tx.category_id ?? '__none__'
    const name = tx.category?.name ?? 'Uncategorised'
    const icon = tx.category?.icon ?? null
    const prev = categoryMap.get(key) ?? { name, icon, total: 0 }
    categoryMap.set(key, { ...prev, total: prev.total + parseAmount(tx.amount) })
  }
  const categoryData = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)

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

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 sm:p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('income')}</p>
          <p className="font-heading text-base sm:text-xl font-semibold tabular-nums text-green-600 dark:text-green-400">
            {symbol} {income.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border p-3 sm:p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('expenses')}</p>
          <p className="font-heading text-base sm:text-xl font-semibold tabular-nums text-red-600 dark:text-red-500">
            {symbol} {expenses.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border p-3 sm:p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('net')}</p>
          <p className={cn(
            'font-heading text-base sm:text-xl font-semibold tabular-nums',
            net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-500',
          )}>
            {net >= 0 ? '+' : '−'}{symbol} {Math.abs(net).toFixed(2)}
          </p>
        </div>
      </div>

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

      <div className="pt-2">
        <Link href="/transactions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← All transactions
        </Link>
      </div>

    </main>
  )
}
