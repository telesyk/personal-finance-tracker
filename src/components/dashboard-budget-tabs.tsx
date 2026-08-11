'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { useTabState } from '@/hooks/use-tab-state'
import { TabSwitcher } from '@/components/tab-switcher'
import { budgetBarColor, budgetLabelClass } from '@/lib/budget'

export interface BudgetScopeData {
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
}

export function DashboardBudgetTabs({ personalData, groupData, groupId, groupName }: Props) {
  const ta = useTranslations('analytics')
  const td = useTranslations('dashboard')
  const tb = useTranslations('budget')

  const { activeTab, changeTab } = useTabState(groupId)
  const d = (!groupId || activeTab === 'personal' || !groupData) ? personalData : groupData

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

      {/* Top-3 category mini-list — shown only when budgets exist for this scope */}
      {Object.keys(d.budgetMap).length > 0 && d.top3.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {td('topCategories')}
            </p>
            <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {td('viewAll')}
            </Link>
          </div>
          <div className="rounded-lg border divide-y">
            {d.top3.map(cat => {
              const budget   = d.budgetMap[cat.key]
              const pct      = budget != null ? Math.round((cat.total / budget) * 100) : null
              const barColor = pct != null ? budgetBarColor(pct) : 'bg-primary/50'
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
                          {d.symbol} {cat.total.toFixed(2)}
                        </span>
                        {' / '}{d.symbol} {budget.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-xs tabular-nums shrink-0 font-semibold">
                        {d.symbol} {cat.total.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {budget != null && pct != null && (
                    <>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className={cn('text-[10px]', budgetLabelClass(pct))}>
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
    </div>
  )
}
