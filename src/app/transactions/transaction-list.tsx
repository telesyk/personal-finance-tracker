'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', UAH: '₴',
}

export interface Transaction {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: string | number
  date: string
  note: string | null
  wallet_id: string
  transfer_to_wallet_id: string | null
  wallet: { name: string; currency: string } | null
  transfer_to_wallet: { name: string } | null
  category: { name: string; icon: string | null } | null
}

interface Wallet { id: string; name: string; currency: string }
interface Category { id: string; name: string; icon: string | null }

interface Props {
  transactions: Transaction[]
  wallets: Wallet[]
  categories: Category[]
  groupId: string
  currentUserId: string
}

type TxType = 'income' | 'expense' | 'transfer'

function todayLocal() {
  return new Date().toLocaleDateString('en-CA')
}

function formatAmount(amount: string | number, currency: string, type: TxType) {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
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

export function TransactionList({ transactions, wallets, categories, groupId, currentUserId }: Props) {
  const router = useRouter()
  const groups = groupByDate(transactions)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [type, setType] = useState<TxType>('expense')
  const [walletId, setWalletId] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('none')
  const [toWalletId, setToWalletId] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [note, setNote] = useState('')

  function openCreate() {
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

  function handleDialogOpenChange(v: boolean) {
    setDialogOpen(v)
    if (!v) setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
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
    const { error } = await supabase.from('transactions').insert({
      group_id: groupId,
      created_by: currentUserId,
      type,
      wallet_id: walletId,
      amount: n,
      category_id: type !== 'transfer' && categoryId !== 'none' ? categoryId : null,
      transfer_to_wallet_id: type === 'transfer' ? toWalletId : null,
      date,
      note: note.trim() || null,
    })

    setLoading(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setDialogOpen(false)
    router.refresh()
  }

  const toWalletOptions = wallets.filter(w => w.id !== walletId)

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Transactions</h1>
        <Button onClick={openCreate} disabled={wallets.length === 0}>Add transaction</Button>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
          <p>No transactions yet.</p>
          <p className="text-sm">Add your first income or expense to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.date}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {formatDateHeader(group.date)}
              </p>
              <div className="space-y-1">
                {group.items.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base w-6 text-center" aria-hidden>
                        {tx.type === 'transfer' ? '↔' : (tx.category?.icon ?? '•')}
                      </span>
                      <div>
                        <p className="font-medium leading-tight">
                          {tx.type === 'transfer'
                            ? `${tx.wallet?.name ?? '?'} → ${tx.transfer_to_wallet?.name ?? '?'}`
                            : (tx.category?.name ?? 'Uncategorised')}
                        </p>
                        {tx.type !== 'transfer' && (
                          <p className="text-xs text-muted-foreground mt-0.5">{tx.wallet?.name}</p>
                        )}
                        {tx.note && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{tx.note}</p>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      'font-medium tabular-nums',
                      tx.type === 'income' && 'text-green-600 dark:text-green-400',
                      tx.type === 'expense' && 'text-red-600 dark:text-red-500',
                      tx.type === 'transfer' && 'text-muted-foreground',
                    )}>
                      {formatAmount(tx.amount, tx.wallet?.currency ?? 'EUR', tx.type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Add transaction</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Type selector */}
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex rounded-md border overflow-hidden">
                {(['expense', 'income', 'transfer'] as TxType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
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

            {/* Wallet (source) */}
            <div className="space-y-2">
              <Label>{type === 'transfer' ? 'From wallet' : 'Wallet'}</Label>
              <Select value={walletId} onValueChange={setWalletId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To wallet (transfer only) */}
            {type === 'transfer' && (
              <div className="space-y-2">
                <Label>To wallet</Label>
                <Select value={toWalletId} onValueChange={setToWalletId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {toWalletOptions.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Category (income / expense only) */}
            {type !== 'transfer' && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon ? `${c.icon} ${c.name}` : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date */}
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

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="tx-note">Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
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
                {loading ? 'Saving…' : 'Add transaction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}
