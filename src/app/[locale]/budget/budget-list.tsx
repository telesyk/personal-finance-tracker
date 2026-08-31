'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2 } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTabState } from '@/hooks/use-tab-state'
import { TabSwitcher } from '@/components/tab-switcher'
import { MonthNav } from '@/components/month-nav'
import { currentMonthStr } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { cn, nativeSelectClass } from '@/lib/utils'
import { currencySymbol, parseAmount } from '@/lib/currency'
import { budgetBarColor, budgetLabelClass } from '@/lib/budget'
import { CategoryGroupedSelect } from '@/components/category-grouped-select'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Budget {
  id: string
  group_id: string
  owner_id: string | null   // null = group budget, uid = personal budget
  category_id: string | null
  amount: number
  month: string             // YYYY-MM — budget is scoped to this month
  created_at: string
  category: {
    id: string
    name: string
    icon: string | null
    parent_id: string | null
  } | null
}

export interface Category {
  id: string
  name: string
  icon: string | null
  type: 'income' | 'expense' | null
  parent_id: string | null
}

// categoryId → actual spend this month
export type Actuals = Record<string, number>

export interface Wallet {
  id: string
  currency: string
  balance: string | number
  is_primary: boolean
  owner_id: string | null
  group_id: string | null
}

interface Props {
  budgets: Budget[]
  categories: Category[]
  wallets: Wallet[]
  currentUserId: string
  groupId: string | null
  groupName: string | null
  month: string
  personalActuals: Actuals
  groupActuals: Actuals
  personalTotalActual: number
  groupTotalActual: number
}

// ── BudgetRow ─────────────────────────────────────────────────────────────────

function BudgetRow({
  budget,
  actual,
  symbol,
  onEdit,
  onDelete,
}: {
  budget: Budget
  actual: number
  symbol: string
  onEdit: (b: Budget) => void
  onDelete: (b: Budget) => void
}) {
  const t = useTranslations('budget')

  const limit = Number(budget.amount)
  const pct   = limit > 0 ? Math.round((actual / limit) * 100) : 0

  const barColor   = budgetBarColor(pct)
  const labelClass = budgetLabelClass(pct)
  const label      = pct >= 100 ? `⚠ ${t('overBudget')} · ${pct}%` : pct >= 80 ? `${pct}% · ${t('nearLimit')}` : `${pct}% ${t('used')}`

  return (
    <div className="rounded-lg border px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        {/* Category label */}
        <div className="flex items-center gap-2 text-sm font-medium min-w-0">
          {budget.category && (
            <>
              <span aria-hidden="true">{budget.category.icon}</span>
              <span className="truncate">{budget.category.name}</span>
            </>
          )}
        </div>

        {/* Amounts + action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            <span className={cn('font-semibold', pct >= 100 ? 'text-destructive' : 'text-foreground')}>
              {symbol}{actual.toFixed(2)}
            </span>
            {' / '}
            {symbol}{limit.toFixed(2)}
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
  categories,
  wallets,
  currentUserId,
  groupId,
  groupName,
  month,
  personalActuals,
  groupActuals,
  personalTotalActual,
  groupTotalActual,
}: Props) {
  const router = useRouter()
  const t  = useTranslations('budget')
  const tf = useTranslations('budget.form')
  const td = useTranslations('budget.delete')
  const tc = useTranslations('common')

  const { activeTab, changeTab } = useTabState(groupId)

  // ── form dialog state ──
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [loading, setLoading]             = useState(false)
  const [formError, setFormError]         = useState<string | null>(null)
  const [categoryId, setCategoryId]       = useState('none')
  const [amount, setAmount]               = useState('')
  const [formMonth, setFormMonth]         = useState(month)

  // ── delete dialog state ──
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null)
  const [deleteLoading, setDeleteLoading]   = useState(false)
  const [deleteError, setDeleteError]       = useState<string | null>(null)

  // ── derived data ──
  const personalBudgets = budgets.filter(b => b.owner_id === currentUserId)
  const groupBudgets    = budgets.filter(b => b.owner_id === null)
  const visibleBudgets  = !groupId || activeTab === 'personal' ? personalBudgets : groupBudgets
  const actuals         = activeTab === 'personal' ? personalActuals : groupActuals

  // ── wallet / currency helpers ──
  const visibleWallets = !groupId || activeTab === 'personal'
    ? wallets.filter(w => w.owner_id === currentUserId)
    : wallets.filter(w => w.group_id !== null)
  const symbol       = currencySymbol(visibleWallets[0]?.currency ?? 'EUR')
  const totalBalance = visibleWallets.reduce((s, w) => s + parseAmount(w.balance), 0)

  // ── budget total summary ──
  const totalPlanned   = visibleBudgets.reduce((s, b) => s + Number(b.amount), 0)
  const totalActual    = activeTab === 'personal' ? personalTotalActual : groupTotalActual
  const spentPct       = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0
  const isOverBalance  = totalBalance > 0 && totalPlanned > totalBalance
  const summaryBarCol  = isOverBalance ? 'bg-destructive' : 'bg-emerald-500'

  // ── handlers ──

  function openCreate() {
    setEditingBudget(null)
    setCategoryId('none')
    setAmount('')
    setFormMonth(month)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(budget: Budget) {
    setEditingBudget(budget)
    setCategoryId(budget.category_id ?? 'none')
    setAmount(String(Number(budget.amount).toFixed(2)))
    setFormError(null)
    setDialogOpen(true)
  }

  function handleDialogOpenChange(v: boolean) {
    setDialogOpen(v)
    if (!v) setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!groupId) return

    if (categoryId === 'none') {
      setFormError(tf('errors.categoryRequired'))
      return
    }

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError(tf('errors.amountPositive'))
      return
    }

    setLoading(true)
    setFormError(null)

    const supabase = createClient()

    const payload = {
      group_id:    groupId,
      // Scope is fixed by the active tab when creating; preserved on edit
      owner_id:    editingBudget ? editingBudget.owner_id : activeTab === 'personal' ? currentUserId : null,
      category_id: categoryId === 'none' ? null : categoryId,
      amount:      parsedAmount,
      month:       editingBudget ? editingBudget.month : formMonth,
    }

    const { error } = editingBudget
      ? await supabase.from('budgets').update({ amount: parsedAmount }).eq('id', editingBudget.id)
      : await supabase.from('budgets').insert(payload)

    setLoading(false)

    if (error) {
      setFormError(error.code === '23505' ? tf('errors.duplicate') : error.message)
      return
    }

    setDialogOpen(false)
    // Navigate to the budget's month if different from the current view
    if (!editingBudget && formMonth !== month) {
      router.push(`/budget?month=${formMonth}`)
    } else {
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!deletingBudget) return
    setDeleteLoading(true)
    setDeleteError(null)

    const supabase = createClient()
    const { error } = await supabase.from('budgets').delete().eq('id', deletingBudget.id)

    setDeleteLoading(false)

    if (error) {
      setDeleteError(error.message)
      return
    }

    setDeletingBudget(null)
    router.refresh()
  }

  const isEdit = editingBudget !== null

  return (
    <main className="w-full sm:max-w-2xl sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <div className="flex items-center gap-1">
          <MonthNav month={month} basePath="/budget" />
          <Button size="sm" onClick={openCreate}>{t('new')}</Button>
        </div>
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

          {/* Budget total summary: spent vs planned, planned vs wallet balance */}
          <div className="rounded-lg border px-4 py-3 space-y-2">

            {/* Planned total */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('summary.planned')}</span>
              <span className="font-semibold tabular-nums">
                {symbol}{totalPlanned.toFixed(2)}
              </span>
            </div>

            {/* Actual spent vs planned */}
            {totalPlanned > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('summary.spent')}</span>
                  <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    <span className={cn('font-semibold', spentPct >= 100 ? 'text-destructive' : 'text-foreground')}>
                      {symbol}{totalActual.toFixed(2)}
                    </span>
                    {' / '}
                    {symbol}{totalPlanned.toFixed(2)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-[width]', budgetBarColor(spentPct))}
                    style={{ width: `${Math.min(spentPct, 100)}%` }}
                  />
                </div>
                <p className={cn('text-xs', budgetLabelClass(spentPct))}>
                  {spentPct >= 100
                    ? `⚠ ${t('overBudget')} · ${spentPct}%`
                    : spentPct >= 80
                      ? `${spentPct}% · ${t('nearLimit')}`
                      : `${spentPct}% ${t('used')}`}
                </p>
              </>
            )}

            {/* Planned vs wallet balance */}
            {totalBalance > 0 && (
              <>
                <div className="border-t mt-1 pt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className={cn(isOverBalance && 'text-destructive')}>
                    {isOverBalance && '⚠ '}{isOverBalance ? t('summary.warning') : t('summary.available')}
                  </span>
                  <span className="tabular-nums">{symbol}{totalBalance.toFixed(2)}</span>
                </div>
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', summaryBarCol)}
                    style={{ width: `${Math.min((totalPlanned / totalBalance) * 100, 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {visibleBudgets.map(budget => (
            <BudgetRow
              key={budget.id}
              budget={budget}
              actual={actuals[budget.category_id ?? ''] ?? 0}
              symbol={symbol}
              onEdit={openEdit}
              onDelete={b => { setDeleteError(null); setDeletingBudget(b) }}
            />
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEdit ? tf('titleEdit') : tf('titleNew')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">

            {/* Month — only on create; fixed after creation */}
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="budget-month">{tf('month')}</Label>
                <Input
                  id="budget-month"
                  type="month"
                  min={currentMonthStr()}
                  value={formMonth}
                  onChange={e => setFormMonth(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Category — disabled on edit (scope + category are immutable after creation) */}
            <div className="space-y-2">
              <Label htmlFor="budget-category">{tf('category')}</Label>
              <CategoryGroupedSelect
                id="budget-category"
                value={categoryId}
                onChange={setCategoryId}
                categories={categories}
                placeholder={{ value: 'none', label: tf('categoryPlaceholder'), hidden: true }}
                className={nativeSelectClass}
                disabled={isEdit}
              />
            </div>

            {/* Monthly limit amount */}
            <div className="space-y-2">
              <Label htmlFor="budget-amount">{tf('amount')}</Label>
              <Input
                id="budget-amount"
                type="text"
                inputMode="decimal"
                placeholder={tf('amountPlaceholder')}
                value={amount}
                onChange={e => setAmount(e.target.value.replace(',', '.'))}
                required
                autoFocus={isEdit}
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !amount.trim()}
              >
                {loading
                  ? (isEdit ? tc('saving') : tf('creating'))
                  : (isEdit ? tf('submitEdit') : tf('submitNew'))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingBudget}
        onOpenChange={v => { if (!v) { setDeletingBudget(null); setDeleteError(null) } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{td('title')}</AlertDialogTitle>
            <AlertDialogDescription>{td('description')}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? tc('deleting') : tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </main>
  )
}
