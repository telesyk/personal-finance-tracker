'use client'

import { useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { useTabState } from '@/hooks/use-tab-state'
import { TabSwitcher } from '@/components/tab-switcher'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Budget {
  id: string
  group_id: string
  owner_id: string | null   // null = group budget, uid = personal budget
  category_id: string | null // null = overall budget
  amount: number
  created_at: string
  category: {
    id: string
    name: string
    icon: string | null
    parent_id: string | null
  } | null
}

// categoryId → actual spend this month; '__overall__' key for overall budgets
export type Actuals = Record<string, number>

interface Props {
  budgets: Budget[]
  currentUserId: string
  groupId: string | null
  groupName: string | null
  personalActuals: Actuals
  groupActuals: Actuals
}

// ── BudgetRow ─────────────────────────────────────────────────────────────────

function BudgetRow({
  budget,
  actual,
  onEdit,
  onDelete,
}: {
  budget: Budget
  actual: number
  onEdit: (b: Budget) => void
  onDelete: (b: Budget) => void
}) {
  const t  = useTranslations('budget')
  const tc = useTranslations('common')

  const limit = Number(budget.amount)
  const pct   = limit > 0 ? Math.round((actual / limit) * 100) : 0

  const barColor   = pct >= 100 ? 'bg-destructive'                          : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  const labelClass = pct >= 100 ? 'text-destructive'                        : pct >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
  const label      = pct >= 100 ? `⚠ ${t('overBudget')} · ${pct}%`        : pct >= 80 ? `${pct}% · ${t('nearLimit')}` : `${pct}% ${t('used')}`

  return (
    <div className="rounded-lg border px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        {/* Category label */}
        <div className="flex items-center gap-2 text-sm font-medium min-w-0">
          {budget.category ? (
            <>
              <span aria-hidden="true">{budget.category.icon}</span>
              <span className="truncate">{budget.category.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground italic">{tc('overall')}</span>
          )}
        </div>

        {/* Right side: amounts + actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            <span className={cn('font-semibold', pct >= 100 ? 'text-destructive' : 'text-foreground')}>
              €{actual.toFixed(2)}
            </span>
            {' / '}
            €{limit.toFixed(2)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(budget)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(budget)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-[width]', barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Percentage label */}
      <p className={cn('text-xs', labelClass)}>{label}</p>
    </div>
  )
}

// ── BudgetList ────────────────────────────────────────────────────────────────

export function BudgetList({
  budgets,
  currentUserId,
  groupId,
  groupName,
  personalActuals,
  groupActuals,
}: Props) {
  const t  = useTranslations('budget')

  const { activeTab, changeTab } = useTabState(groupId)

  // Split budgets by scope
  const personalBudgets = budgets.filter(b => b.owner_id === currentUserId)
  const groupBudgets    = budgets.filter(b => b.owner_id === null)
  const visibleBudgets  = !groupId || activeTab === 'personal' ? personalBudgets : groupBudgets
  const actuals         = activeTab === 'personal' ? personalActuals : groupActuals

  // Placeholder handlers — wired up in the form task
  function openCreate() { /* TODO: form task */ }
  function openEdit(_b: Budget) { /* TODO: form task */ }
  function openDelete(_b: Budget) { /* TODO: delete task */ }

  return (
    <main className="w-full sm:max-w-2xl sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <Button size="sm" onClick={openCreate}>{t('new')}</Button>
      </div>

      {/* Tab switcher */}
      {groupId && (
        <TabSwitcher
          tabs={[
            { value: 'personal', label: t('tabPersonal') },
            { value: 'group',    label: groupName ? groupName.slice(0, 50) : t('tabGroup') },
          ]}
          active={activeTab}
          onChange={v => changeTab(v as 'personal' | 'group')}
        />
      )}

      {/* Content */}
      {visibleBudgets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground">
          <p className="text-sm font-medium">
            {activeTab === 'group' && groupId ? t('emptyGroup') : t('empty')}
          </p>
          <p className="text-xs">{t('emptyHint')}</p>
          <Button variant="outline" onClick={openCreate}>{t('addFirst')}</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleBudgets.map(budget => (
            <BudgetRow
              key={budget.id}
              budget={budget}
              actual={actuals[budget.category_id ?? '__overall__'] ?? 0}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

    </main>
  )
}
