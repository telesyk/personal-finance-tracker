'use client'

import { useState } from 'react'
import { useTabState } from '@/hooks/use-tab-state'
import { useRouter } from 'next/navigation'
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

interface Wallet { id: string; name: string; currency: string; balance: string | number; is_primary: boolean }
interface Category { id: string; name: string; icon: string | null; type: 'income' | 'expense' | null }

interface Props {
  transactions: Transaction[]
  wallets: Wallet[]
  categories: Category[]
  groupId: string | null
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

export function TransactionList({ transactions, wallets, categories, groupId, currentUserId, month }: Props) {
  const router = useRouter()
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
      setFormError('Amount must be a positive number.')
      return
    }
    if (type === 'transfer' && !toWalletId) {
      setFormError('Please select a destination wallet.')
      return
    }
    if (type === 'transfer' && toWalletId === walletId) {
      setFormError('Source and destination wallets must be different.')
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

  const visibleTransactions = !groupId || activeTab === 'personal'
    ? transactions.filter(tx => tx.wallet?.owner_id === currentUserId)
    : transactions.filter(tx => tx.wallet?.group_id !== null)
  const groups = groupByDate(visibleTransactions)

  const primaryWallet = wallets[0] ?? null
  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(String(w.balance)), 0)
  const primarySymbol = primaryWallet ? currencySymbol(primaryWallet.currency) : ''
  const primaryBalance = primaryWallet ? parseFloat(String(primaryWallet.balance)).toFixed(2) : null

  return (
    <main className="w-full sm:max-w-4xl sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center  md:justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold">Transactions</h1>
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
          <Button onClick={openCreate} disabled={wallets.length === 0} size="sm">
            <Plus className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Add transaction</span>
          </Button>
        </div>
      </div>

      {primaryWallet && (
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-x-4 gap-y-1 rounded-lg bg-muted/40 border px-4 py-2.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase tracking-wide">
              {primaryWallet.is_primary ? 'Primary' : 'Main'}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {primarySymbol} {primaryBalance}
            </span>
            <span className="text-muted-foreground/60">{primaryWallet.name}</span>
          </div>
          {wallets.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs uppercase tracking-wide">All wallets</span>
              <span className="font-medium tabular-nums text-foreground">
                {primarySymbol} {totalBalance.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {groupId && (
        <TabSwitcher
          tabs={[{ value: 'personal', label: 'Personal' }, { value: 'group', label: 'Group' }]}
          active={activeTab}
          onChange={v => changeTab(v as 'personal' | 'group')}
        />
      )}

      {visibleTransactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
          <p>{isCurrentMonth ? 'No transactions yet.' : `No transactions in ${monthLabel(month)}.`}</p>
          {isCurrentMonth && <p className="text-sm">Add your first income or expense to get started.</p>}
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {groups.map(group => (
            <React.Fragment key={`date-${group.date}`}>
              <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
                {formatDateHeader(group.date)}
              </div>
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
                        ? 'Transfer'
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
              {isEdit ? 'Edit transaction' : 'Add transaction'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex rounded-md border overflow-hidden">
                {(['expense', 'income', 'transfer'] as TxType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); setCategoryId('none') }}
                    className={cn(
                      'flex-1 py-2 text-sm font-medium capitalize transition-colors',
                      type === t
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-wallet">{type === 'transfer' ? 'From wallet' : 'Wallet'}</Label>
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
                <Label htmlFor="tx-to-wallet">To wallet</Label>
                <select
                  id="tx-to-wallet"
                  value={toWalletId}
                  onChange={e => setToWalletId(e.target.value)}
                  required
                  className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-base text-foreground outline-none focus:border-b-ring md:text-sm disabled:opacity-50"
                >
                  <option value="">Select destination</option>
                  {toWalletOptions.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tx-amount">Amount</Label>
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
                <Label htmlFor="tx-category">Category</Label>
                <select
                  id="tx-category"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-base text-foreground outline-none focus:border-b-ring md:text-sm disabled:opacity-50"
                >
                  <option value="none">— None —</option>
                  {filteredCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tx-date">Date</Label>
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
                Note <span className="text-muted-foreground font-normal">(optional)</span>
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
                  ? (isEdit ? 'Saving…' : 'Adding…')
                  : (isEdit ? 'Save changes' : 'Add transaction')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingTx} onOpenChange={v => { if (!v) setDeletingTx(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The wallet balance will be updated automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
