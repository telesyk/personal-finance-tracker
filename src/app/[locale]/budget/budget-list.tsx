'use client'

import { useTranslations } from 'next-intl'
import { useTabState } from '@/hooks/use-tab-state'
import { TabSwitcher } from '@/components/tab-switcher'
import { Button } from '@/components/ui/button'

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

interface Props {
  budgets: Budget[]
  currentUserId: string
  groupId: string | null
  groupName: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BudgetList({ budgets, currentUserId, groupId, groupName }: Props) {
  const t = useTranslations('budget')
  const tc = useTranslations('common')

  const { activeTab, changeTab } = useTabState(groupId)

  // Split by scope: personal = owner_id matches current user; group = owner_id is null
  const personalBudgets = budgets.filter(b => b.owner_id === currentUserId)
  const groupBudgets    = budgets.filter(b => b.owner_id === null)
  const visibleBudgets  = !groupId || activeTab === 'personal' ? personalBudgets : groupBudgets

  const isEmpty = visibleBudgets.length === 0

  return (
    <main className="w-full sm:max-w-2xl sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <Button size="sm">{t('new')}</Button>
      </div>

      {/* Tab switcher — only shown when the user belongs to a group */}
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

      {/* Content area */}
      {isEmpty ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground">
          <p>{activeTab === 'group' && groupId ? t('emptyGroup') : t('empty')}</p>
          <p className="text-sm">{t('emptyHint')}</p>
          <Button variant="outline">{t('addFirst')}</Button>
        </div>
      ) : (
        /* Budget rows — implemented in the next task */
        <div className="space-y-3">
          {visibleBudgets.map(budget => (
            <div key={budget.id} className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
              {budget.category?.name ?? tc('overall')} — {budget.amount}
            </div>
          ))}
        </div>
      )}

    </main>
  )
}
