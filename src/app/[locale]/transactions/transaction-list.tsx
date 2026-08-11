'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTabState } from '@/hooks/use-tab-state'
import { useWalletRealtime } from '@/hooks/use-wallet-realtime'
import { useRouter } from '@/i18n/navigation'
import { Pencil, Trash2, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { currencySymbol } from '@/lib/currency'
import { currentMonthStr, monthLabel, prevMonth, nextMonth } from '@/lib/date'
import { TabSwitcher } from '@/components/tab-switcher'
import React from 'react'

export interface Transaction {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: string | number
  date: string
  note: string | null
  wallet_id: string
  transfer_to_wallet_id: string | null
  category_id: string | null
  wallet: { name: string; currency: string; owner_id: string | null; group_id: string | null } | null
  transfer_to_wallet: { name: string } | null
  category: { name: string; icon: string | null } | null
}

interface Wallet { id: string; name: string; currency: string; balance: string | number; is_primary: boolean; owner_id: string | null; group_id: string | null }
interface Category { id: string; name: string; icon: string | null; type: 'income' | 'expense' | null; parent_id: string | null }

interface Props {
  transactions: Transaction[]
  wallets: Wallet[]
  categories: Category[]
  groupId: string | null
  groupName: string | null
  currentUserId: string
  month: string
}

type TxType = 'income' | 'expense' | 'transfer'

function todayLocal() {
  return new Date().toLocaleDateString('en-CA')
}

function formatAmount(amount: string | number, currency: string, type: TxType) {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  const symbol = currencySymbol(currency)
  const formatted = `${symbol} ${n.toFixed(2)}`
  if (type === 'income') return `+${formatted}`
  if (type === 'expense') return `−${formatted}`
  return formatted
}

function groupByDate(transactions: Transaction[]) {
  const groups: { date: string; items: Transaction[] }[] = []
  for (const tx of transactions) {
    const last = groups[groups.length - 1]
    if (last && last.date === tx.date) {
      last.items.push(tx)
    } else {
      groups.push({ date: tx.date, items: [tx] })
    }
  }
  return groups
}



function formatDateHeader(dateStr: string) {
  const todayStr = new Date().toLocaleDateString('en-CA')
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
  if (dateStr === todayStr) return 'Today'
  if (dateStr === yesterdayStr) return 'Yesterday'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function TransactionList({ transactions, wallets, categories, groupId, groupName, currentUserId, month }: Props) {
  const router = useRouter()
  const t = useTranslations('transactions')
  const tf = useTranslations('transactions.form')
  const tc = useTranslations('common')
  const isCurrentMonth = month === currentMonthStr()

  // form dialog
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // form fields
  const [type, setType] = useState<TxType>('expense')
  const [walletId, setWalletId] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('none')
  const [toWalletId, setToWalletId] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [note, setNote] = useState('')

  // delete dialog
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // mobile: which row is showing its action buttons
  const [activeId, setActiveId] = useState<string | null>(null)

  // personal / group tab
  const { activeTab, changeTab } = useTabState(groupId)
  useWalletRealtime()

  function openCreate() {
    setEditingTx(null)
    setType('expense')
    setWalletId(wallets[0]?.id ?? '')
    setAmount('')
    setCategoryId('none')
    setToWalletId('')
    setDate(todayLocal())
    setNote('')
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx)
    setType(tx.type)
    setWalletId(tx.wallet_id)
    setAmount(String(typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount))
    setCategoryId(tx.category_id ?? 'none')
    setToWalletId(tx.transfer_to_wallet_id ?? '')
    setDate(tx.date)
    setNote(tx.note ?? '')
    setFormError(null)
    setDialogOpen(true)
  }

  function handleDialogOpenChange(v: boolean) {
    setDialogOpen(v)
    if (!v) setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const n = parseFloat(amount)
    if (!isFinite(n) || n <= 0) {
      setFormError(tf('errors.positiveAmount'))
      return
    }
    if (type === 'transfer' && !toWalletId) {
      setFormError(tf('errors.selectDestination'))
      return
    }
    if (type === 'transfer' && toWalletId === walletId) {
      setFormError(tf('errors.sameWallet'))
      return
    }

    setLoading(true)

    const supabase = createClient()
    const payload = {
      type,
      wallet_id: walletId,
      amount: n,
      category_id: type !== 'transfer' && categoryId !== 'none' ? categoryId : null,
      transfer_to_wallet_id: type === 'transfer' ? toWalletId : null,
      date,
      note: note.trim() || null,
    }

    const { error } = editingTx
      ? await supabase.from('transactions').update(payload).eq('id', editingTx.id)
      : await supabase.from('transactions').insert({ ...payload, created_by: currentUserId })

    setLoading(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setDialogOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!deletingTx) return
    setDeleteLoading(true)
    setDeleteError(null)

    const supabase = createClient()
    const { error } = await supabase.from('transactions').delete().eq('id', deletingTx.id)

    setDeleteLoading(false)

    if (error) {
      setDeleteError(error.message)
      return
    }

    setDeletingTx(null)
    router.refresh()
  }

  const isEdit = editingTx !== null
  const toWalletOptions = wallets.filter(w => w.id !== walletId)
  const filteredCategories = categories.filter(c => c.type === type)
  // Split into parents (no parent_id) and children, for grouped <select>
  const parentCategories = filteredCategories.filter(c => !c.parent_id)
  const childCategories  = filteredCategories.filter(c =>  c.parent_id)

  const visibleTransactions = !groupId || activeTab === 'personal'
    ? transactions.filter(tx => tx.wallet?.owner_id === currentUserId)
    : transactions.filter(tx => tx.wallet?.group_id !== null)
  const groups = groupByDate(visibleTransactions)

  const personalWallets = wallets.filter(w => w.owner_id === currentUserId)
  const groupWallets = wallets.filter(w => w.group_id !== null)
  const primaryWallet = personalWallets.find(w => w.is_primary) ?? personalWallets[0] ?? null
  const primarySymbol = primaryWallet ? currencySymbol(primaryWallet.currency) : ''
  const personalTotal = personalWallets.reduce((s, w) => s + parseFloat(String(w.balance)), 0)
  const groupTotal = groupWallets.reduce((s, w) => s + parseFloat(String(w.balance)), 0)

  return (
    <main className="w-full sm:max-w-4xl sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center  md:justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/transactions?month=${prevMonth(month)}`)}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium w-28 text-center">{monthLabel(month)}</span>
            <button
              onClick={() => router.push(`/transactions?month=${nextMonth(month)}`)}
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
          <Button onClick={openCreate} disabled={wallets.length === 0} size="sm" className="hidden md:flex">
            {t('add')}
          </Button>
        </div>
      </div>

      {groupId && (
        <TabSwitcher
          tabs={[{ value: 'personal', label: t('tabPersonal') }, { value: 'group', label: groupName ? groupName.slice(0, 50) : t('tabGroup') }]}
          active={activeTab}
          onChange={v => changeTab(v as 'personal' | 'group')}
        />
      )}

      {/* Wallet summary — tab-aware */}
      {(!groupId || activeTab === 'personal') && primaryWallet && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/40 border px-4 py-2.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase tracking-wide">
              {primaryWallet.is_primary ? t('primaryWallet') : t('mainWallet')}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {primarySymbol} {parseFloat(String(primaryWallet.balance)).toFixed(2)}
            </span>
            <span className="text-muted-foreground/60">{primaryWallet.name}</span>
          </div>
          {personalWallets.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wide">{t('allPersonal')}</span>
              <span className="font-medium tabular-nums text-foreground">
                {primarySymbol} {personalTotal.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {groupId && activeTab === 'group' && groupWallets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 border px-4 py-2.5">
          {groupWallets.map(w => (
            <span key={w.id} className="inline-flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1">
              <span className="text-muted-foreground">{w.name}</span>
              <span className="font-medium tabular-nums">{currencySymbol(w.currency)} {parseFloat(String(w.balance)).toFixed(2)}</span>
            </span>
          ))}
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {t('groupTotal')}: {primarySymbol} {groupTotal.toFixed(2)}
          </span>
        </div>
      )}

      {visibleTransactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
          <p>{isCurrentMonth ? t('empty') : t('emptyMonth', { month: monthLabel(month) })}</p>
          {isCurrentMonth && <p className="text-sm">{t('emptyHint')}</p>}
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {groups.map(group => (
            <React.Fragment key={`date-${group.date}`}>
              {(() => {
                const dayNet = group.items.reduce((s, tx) => {
                  const n = parseFloat(String(tx.amount))
                  if (tx.type === 'income') return s + n
                  if (tx.type === 'expense') return s - n
                  return s
                }, 0)
                return (
                  <div className="px-4 py-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
                    <span>{formatDateHeader(group.date)}</span>
                    {dayNet !== 0 && (
                      <span className={cn('tabular-nums normal-case font-medium', dayNet > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-500')}>
                        {dayNet > 0 ? '+' : '−'}{primarySymbol} {Math.abs(dayNet).toFixed(2)}
                      </span>
                    )}
                  </div>
                )
              })()}
              {group.items.map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors sm:cursor-default cursor-pointer"
                  onClick={() => setActiveId(activeId === tx.id ? null : tx.id)}
                >
                  <span className="text-xl shrink-0 w-7 text-center" aria-hidden>
                    {tx.type === 'transfer' ? '↔' : (tx.category?.icon ?? '•')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {tx.type === 'transfer'
                        ? t('types.transfer')
                        : (tx.category?.name ?? 'Uncategorised')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tx.type === 'transfer'
                        ? `${tx.wallet?.name ?? '?'} → ${tx.transfer_to_wallet?.name ?? '?'}`
                        : tx.wallet?.name ?? '—'}
                      {tx.note && <span className="italic"> · {tx.note}</span>}
                    </p>
                  </div>
                  <span className={cn(
                    'text-sm font-medium tabular-nums shrink-0',
                    tx.type === 'income' && 'text-green-600 dark:text-green-400',
                    tx.type === 'expense' && 'text-red-600 dark:text-red-500',
                    tx.type === 'transfer' && 'text-muted-foreground',
                  )}>
                    {formatAmount(tx.amount, tx.wallet?.currency ?? 'EUR', tx.type)}
                  </span>
                  <div className={cn(
                    'items-center gap-0.5 shrink-0',
                    activeId === tx.id ? 'flex' : 'hidden sm:flex',
                  )}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); openEdit(tx) }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteError(null); setDeletingTx(tx) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEdit ? tf('titleEdit') : tf('titleNew')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{tf('type')}</Label>
              <div className="flex rounded-md border overflow-hidden">
                {(['expense', 'income', 'transfer'] as TxType[]).map(txType => (
                  <button
                    key={txType}
                    type="button"
                    onClick={() => { setType(txType); setCategoryId('none') }}
                    className={cn(
                      'flex-1 py-2 text-sm font-medium capitalize transition-colors',
                      type === txType
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t(`types.${txType}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-wallet">{type === 'transfer' ? tf('fromWallet') : tf('wallet')}</Label>
              <select
                id="tx-wallet"
                value={walletId}
                onChange={e => setWalletId(e.target.value)}
                required
                className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-base text-foreground outline-none focus:border-b-ring md:text-sm disabled:opacity-50"
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div className="space-y-2">
                <Label htmlFor="tx-to-wallet">{tf('toWallet')}</Label>
                <select
                  id="tx-to-wallet"
                  value={toWalletId}
                  onChange={e => setToWalletId(e.target.value)}
                  required
                  className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-base text-foreground outline-none focus:border-b-ring md:text-sm disabled:opacity-50"
                >
                  <option value="">{tf('toWalletPlaceholder')}</option>
                  {toWalletOptions.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tx-amount">{tf('amount')}</Label>
              <Input
                id="tx-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(',', '.'))}
                required
                autoFocus
              />
            </div>

            {type !== 'transfer' && (
              <div className="space-y-2">
                <Label htmlFor="tx-category">{tf('category')}</Label>
                <select
                  id="tx-category"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-base text-foreground outline-none focus:border-b-ring md:text-sm disabled:opacity-50"
                >
                  <option value="none">{tf('categoryNone')}</option>
                  {parentCategories.map(parent => {
                    const children = childCategories.filter(c => c.parent_id === parent.id)
                    if (children.length === 0) {
                      // Leaf parent — directly selectable
                      return (
                        <option key={parent.id} value={parent.id}>
                          {parent.icon ? `${parent.icon} ${parent.name}` : parent.name}
                        </option>
                      )
                    }
                    // Parent with children — render as optgroup
                    return (
                      <optgroup key={parent.id} label={parent.icon ? `${parent.icon} ${parent.name}` : parent.name}>
                        {children.map(child => (
                          <option key={child.id} value={child.id}>
                            {child.icon ? `${child.icon} ${child.name}` : child.name}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tx-date">{tf('date')}</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-note">
                {tf('note')} <span className="text-muted-foreground font-normal">({tc('optional')})</span>
              </Label>
              <Textarea
                id="tx-note"
                placeholder="e.g. Monthly groceries"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                maxLength={200}
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading || !walletId || !amount}>
                {loading
                  ? (isEdit ? tc('saving') : tf('adding'))
                  : (isEdit ? tf('submitEdit') : tf('submitNew'))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingTx} onOpenChange={v => { if (!v) setDeletingTx(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('delete.description')}</AlertDialogDescription>
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
