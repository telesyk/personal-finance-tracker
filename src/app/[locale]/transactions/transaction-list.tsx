'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTabState } from '@/hooks/use-tab-state'
import { useWalletRealtime } from '@/hooks/use-wallet-realtime'
import { useRouter } from '@/i18n/navigation'
import { Pencil, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn, nativeSelectClass } from '@/lib/utils'
import { currencySymbol } from '@/lib/currency'
import { currentMonthStr, monthLabel } from '@/lib/date'
import { TabSwitcher } from '@/components/tab-switcher'
import { MonthNav } from '@/components/month-nav'
import { CategoryGroupedSelect } from '@/components/category-grouped-select'
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
  categoryFilter: string   // UUID or 'all' — from ?category= URL param
  walletFilter:   string   // UUID or 'all' — from ?wallet= URL param
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

export function TransactionList({ transactions, wallets, categories, groupId, groupName, currentUserId, month, categoryFilter, walletFilter }: Props) {
  const router = useRouter()
  const t = useTranslations('transactions')
  const tf = useTranslations('transactions.form')
  const tc = useTranslations('common')
  const tw = useTranslations('wallets')
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

  // note search (client-side only — does not persist in URL)
  const [noteSearch, setNoteSearch] = useState('')

  // mobile: which row is showing its action buttons
  const [activeId, setActiveId] = useState<string | null>(null)

  // personal / group tab
  const { activeTab, changeTab } = useTabState(groupId)
  useWalletRealtime()

  // ── filters ───────────────────────────────────────────────────────────────
  /** Build URL params preserving ?month= and applying both filter values. */
  function buildFilterParams(overrides: { category?: string; wallet?: string }) {
    const cat = overrides.category ?? categoryFilter
    const wal = overrides.wallet   ?? walletFilter
    const p = new URLSearchParams()
    if (month !== currentMonthStr()) p.set('month', month)
    if (cat !== 'all') p.set('category', cat)
    if (wal !== 'all') p.set('wallet',   wal)
    return p
  }

  function pushCategoryFilter(cat: string) {
    const p = buildFilterParams({ category: cat })
    router.push(`/transactions${p.size > 0 ? '?' + p.toString() : ''}`)
  }

  function pushWalletFilter(wal: string) {
    const p = buildFilterParams({ wallet: wal })
    router.push(`/transactions${p.size > 0 ? '?' + p.toString() : ''}`)
  }

  /** When switching tabs, drop both URL filters and clear note search. */
  function handleTabChange(newTab: 'personal' | 'group') {
    changeTab(newTab)
    setNoteSearch('')
    if (categoryFilter !== 'all' || walletFilter !== 'all') {
      const p = new URLSearchParams()
      if (month !== currentMonthStr()) p.set('month', month)
      router.push(`/transactions${p.size > 0 ? '?' + p.toString() : ''}`)
    }
  }

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

  /** Label a wallet option: appends "(shared)" for group wallets owned by someone else. */
  function walletOptionLabel(w: Wallet) {
    if (w.owner_id !== currentUserId && w.group_id !== null) {
      return `${w.name} (${tw('shared').toLowerCase()})`
    }
    return w.name
  }

  // Tab-scoped transactions (personal vs. group)
  const visibleTransactions = !groupId || activeTab === 'personal'
    ? transactions.filter(tx => tx.wallet?.owner_id === currentUserId)
    : transactions.filter(tx => tx.wallet?.group_id !== null)

  // Unique categories that appear in this tab's transactions (for the filter dropdown)
  const filterableCategories = (() => {
    const map = new Map<string, { id: string; name: string; icon: string | null }>()
    for (const tx of visibleTransactions) {
      if (tx.category_id && tx.category && !map.has(tx.category_id)) {
        map.set(tx.category_id, { id: tx.category_id, name: tx.category.name, icon: tx.category.icon })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  })()

  // Unique wallets that appear in this tab's transactions (for the wallet filter dropdown)
  const filterableWallets = (() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const tx of visibleTransactions) {
      if (tx.wallet_id && tx.wallet && !map.has(tx.wallet_id)) {
        map.set(tx.wallet_id, { id: tx.wallet_id, name: tx.wallet.name })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  })()

  // Active filters — fall back to 'all' if the selected value is not in this tab's data
  const activeCategory = filterableCategories.some(c => c.id === categoryFilter) ? categoryFilter : 'all'
  const activeWallet   = filterableWallets.some(w => w.id === walletFilter)      ? walletFilter   : 'all'

  // Apply all three filters on top of tab filter
  const noteQuery = noteSearch.trim().toLowerCase()
  const displayedTransactions = visibleTransactions
    .filter(tx => activeCategory === 'all' || tx.category_id === activeCategory)
    .filter(tx => activeWallet   === 'all' || tx.wallet_id   === activeWallet)
    .filter(tx => !noteQuery || (tx.note ?? '').toLowerCase().includes(noteQuery))

  const groups = groupByDate(displayedTransactions)

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
          <MonthNav month={month} basePath="/transactions" labelWidth="w-28" />
          <Button onClick={openCreate} disabled={wallets.length === 0} size="sm" className="hidden md:flex">
            {t('add')}
          </Button>
        </div>
      </div>

      {groupId && (
        <TabSwitcher
          tabs={[{ value: 'personal', label: t('tabPersonal') }, { value: 'group', label: groupName ? groupName.slice(0, 50) : t('tabGroup') }]}
          active={activeTab}
          onChange={v => handleTabChange(v as 'personal' | 'group')}
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

      {/* Filters — only when there is data to filter on */}
      {(filterableCategories.length > 0 || filterableWallets.length > 1) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {filterableCategories.length > 0 && (
            <select
              value={activeCategory}
              onChange={e => pushCategoryFilter(e.target.value)}
              className={nativeSelectClass}
              aria-label={t('filterAllCategories')}
            >
              <option value="all">{t('filterAllCategories')}</option>
              {filterableCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
          )}
          {filterableWallets.length > 1 && (
            <select
              value={activeWallet}
              onChange={e => pushWalletFilter(e.target.value)}
              className={nativeSelectClass}
              aria-label={t('filterAllWallets')}
            >
              <option value="all">{t('filterAllWallets')}</option>
              {filterableWallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Note search */}
      {visibleTransactions.length > 0 && (
        <div className="relative">
          <Input
            type="search"
            placeholder={t('searchNotePlaceholder')}
            value={noteSearch}
            onChange={e => setNoteSearch(e.target.value)}
            className="pr-8"
          />
          {noteSearch && (
            <button
              type="button"
              onClick={() => setNoteSearch('')}
              aria-label={t('searchNoteClear')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {visibleTransactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
          <p>{isCurrentMonth ? t('empty') : t('emptyMonth', { month: monthLabel(month) })}</p>
          {isCurrentMonth && <p className="text-sm">{t('emptyHint')}</p>}
        </div>
      ) : displayedTransactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
          <p className="text-sm">{t('emptyFilter')}</p>
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
                className={nativeSelectClass}
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>
                    {type === 'transfer' ? walletOptionLabel(w) : w.name}
                  </option>
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
                  className={nativeSelectClass}
                >
                  <option value="">{tf('toWalletPlaceholder')}</option>
                  {toWalletOptions.map(w => (
                    <option key={w.id} value={w.id}>{walletOptionLabel(w)}</option>
                  ))}
                </select>
                {toWalletId && toWalletOptions.find(w => w.id === toWalletId && w.owner_id !== currentUserId) && (
                  <p className="text-xs text-muted-foreground">{tf('transferSharedNote')}</p>
                )}
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
                <CategoryGroupedSelect
                  id="tx-category"
                  value={categoryId}
                  onChange={setCategoryId}
                  categories={filteredCategories}
                  placeholder={{ value: 'none', label: tf('categoryNone') }}
                  className={nativeSelectClass}
                />
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
