'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import type { AnalyticsTransaction } from './page'

const CURRENCY_SYMBOL: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', UAH: '₴' }

interface Wallet {
  id: string
  name: string
  currency: string
  balance: string | number
  is_primary: boolean
}

interface Props {
  month: string
  transactions: AnalyticsTransaction[]
  wallets: Wallet[]
}

function parseAmount(v: string | number) {
  return typeof v === 'string' ? parseFloat(v) : v
}

function monthLabel(month: string) {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function prevMonth(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const d = new Date(year, mon - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(month: string) {
  const [year, mon] = month.split('-').map(Number)
  const d = new Date(year, mon, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function AnalyticsDashboard({ month, transactions, wallets }: Props) {
  const router = useRouter()
  const symbol = wallets[0] ? (CURRENCY_SYMBOL[wallets[0].currency] ?? wallets[0].currency) : '€'
  const isCurrentMonth = month === currentMonthStr()

  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + parseAmount(t.amount), 0)

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + parseAmount(t.amount), 0)

  const net = income - expenses

  // Category breakdown — expenses only
  const categoryMap = new Map<string, { name: string; icon: string | null; total: number }>()
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    const key = tx.category_id ?? '__none__'
    const name = tx.category?.name ?? 'Uncategorised'
    const icon = tx.category?.icon ?? null
    const prev = categoryMap.get(key) ?? { name, icon, total: 0 }
    categoryMap.set(key, { ...prev, total: prev.total + parseAmount(tx.amount) })
  }
  const categoryData = Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total)

  return (
    <main className="w-full sm:max-w-3xl sm:mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">

      {/* Header + month nav */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Analytics</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/analytics?month=${prevMonth(month)}`)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-0 text-center">{monthLabel(month)}</span>
          <button
            onClick={() => router.push(`/analytics?month=${nextMonth(month)}`)}
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
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 sm:p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Income</p>
          <p className="font-heading text-base sm:text-xl font-semibold tabular-nums text-green-600 dark:text-green-400">
            {symbol} {income.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border p-3 sm:p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expenses</p>
          <p className="font-heading text-base sm:text-xl font-semibold tabular-nums text-red-600 dark:text-red-500">
            {symbol} {expenses.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border p-3 sm:p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net</p>
          <p className={cn(
            'font-heading text-base sm:text-xl font-semibold tabular-nums',
            net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-500',
          )}>
            {net >= 0 ? '+' : '−'}{symbol} {Math.abs(net).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Category bar chart */}
      <div className="space-y-3">
        <h2 className="font-heading text-base font-semibold">Expenses by category</h2>
        {categoryData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No expenses recorded for this month.</p>
        ) : (
          <div className="rounded-lg border p-4">
            <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 44)}>
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${symbol}${v}`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(name, i) => {
                    const icon = categoryData[i]?.icon
                    return icon ? `${icon} ${name}` : name
                  }}
                />
                <Tooltip
                  formatter={(value) => [`${symbol} ${Number(value).toFixed(2)}`, 'Amount']}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill="hsl(var(--primary))" fillOpacity={1 - i * 0.06} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Wallet summary */}
      <div className="space-y-3">
        <h2 className="font-heading text-base font-semibold">Wallets</h2>
        {wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wallets yet.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            {wallets.map(w => {
              const s = CURRENCY_SYMBOL[w.currency] ?? w.currency
              return (
                <div key={w.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{w.name}</span>
                    {w.is_primary && (
                      <span className="text-xs px-1.5 py-0.5 rounded border border-primary/40 text-primary bg-primary/10">
                        Primary
                      </span>
                    )}
                  </div>
                  <span className="font-medium tabular-nums">
                    {s} {parseAmount(w.balance).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="pt-2">
        <Link href="/transactions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← All transactions
        </Link>
      </div>

    </main>
  )
}
