'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { useTabState } from '@/hooks/use-tab-state'
import { budgetBarColor, budgetLabelClass } from '@/lib/budget'
import { type BudgetScopeData } from '@/components/dashboard-budget-tabs'

interface Props {
  personalData: BudgetScopeData
  groupData: BudgetScopeData | null
  groupId: string | null
}

export function DashboardTopSpending({ personalData, groupData, groupId }: Props) {
  const td = useTranslations('dashboard')
  const tb = useTranslations('budget')

  const { activeTab } = useTabState(groupId)
  const d = (!groupId || activeTab === 'personal' || !groupData) ? personalData : groupData

  if (Object.keys(d.budgetMap).length === 0 || d.top3.length === 0) return null

  return (
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
  )
}
