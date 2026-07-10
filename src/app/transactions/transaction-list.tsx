'use client'

import { Button } from '@/components/ui/button'
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

interface Props {
  transactions: Transaction[]
}

function formatAmount(amount: string | number, currency: string, type: Transaction['type']) {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  const formatted = `${symbol} ${n.toFixed(2)}`
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
  const yesterday = new Date(Date.now() - 86400000)
  const yesterdayStr = yesterday.toLocaleDateString('en-CA')
  if (dateStr === todayStr) return 'Today'
  if (dateStr === yesterdayStr) return 'Yesterday'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function TransactionList({ transactions }: Props) {
  const groups = groupByDate(transactions)

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Transactions</h1>
        <Button disabled>Add transaction</Button>
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
    </main>
  )
}
