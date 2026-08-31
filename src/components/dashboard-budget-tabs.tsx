'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { useTabState } from '@/hooks/use-tab-state'
import { TabSwitcher } from '@/components/tab-switcher'
import { budgetBarColor } from '@/lib/budget'

export interface BudgetScopeData {
  income: number
  expenses: number
  overallBudget: number | undefined
  budgetMap: Record<string, number>   // { [category_id]: amount }
  top3: { key: string; name: string; icon: string | null; total: number }[]
  symbol: string
}

interface Props {
  personalData: BudgetScopeData
  groupData: BudgetScopeData | null   // null when user has no group
  groupId: string | null
  groupName: string | null
  monthLabel: string
}

export function DashboardBudgetTabs({ personalData, groupData, groupId, groupName, monthLabel }: Props) {
  const ta = useTranslations('analytics')
  const td = useTranslations('dashboard')
  const tb = useTranslations('budget')

  const { activeTab, changeTab } = useTabState(groupId)
  const d   = (!groupId || activeTab === 'personal' || !groupData) ? personalData : groupData
  const net = d.income - d.expenses

  return (
    <div className="space-y-4">
      {/* Tab switcher — only when user belongs to a group */}
      {groupId && groupData && (
        <TabSwitcher
          tabs={[
            { value: 'personal', label: ta('tabPersonal') },
            { value: 'group',    label: groupName ? groupName.slice(0, 50) : ta('tabGroup') },
          ]}
          active={activeTab}
          onChange={v => changeTab(v as 'personal' | 'group')}
        />
      )}

      {/* Monthly KPI strip — tab-scoped */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{monthLabel}</p>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {td('fullAnalytics')}
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border px-3 py-2.5 space-y-0.5">
            <p className="text-xs text-muted-foreground">{ta('income')}</p>
            <p className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
              {d.symbol} {d.income.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2.5 space-y-0.5">
            <p className="text-xs text-muted-foreground">{ta('expenses')}</p>
            <p className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-500">
              {d.symbol} {d.expenses.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2.5 space-y-0.5">
            <p className="text-xs text-muted-foreground">{ta('net')}</p>
            <p className={cn(
              'text-sm font-semibold tabular-nums',
              net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-500',
            )}>
              {net >= 0 ? '+' : '−'}{d.symbol} {Math.abs(net).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Budget KPI card */}
      {d.overallBudget != null ? (() => {
        const pct      = Math.round((d.expenses / d.overallBudget) * 100)
        const barColor = budgetBarColor(pct, 70)
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
              {d.symbol} {d.expenses.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {d.symbol}{d.overallBudget.toFixed(0)}
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
            {td('setBudget')}
          </Link>
        </div>
      )}

    </div>
  )
}
