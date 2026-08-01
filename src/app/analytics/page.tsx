import { requireUser } from '@/lib/auth'
import { currentMonthStr, monthDateRange } from '@/lib/date'
import { AnalyticsDashboard } from './analytics-dashboard'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { supabase } = await requireUser()

  const params = await searchParams
  const month = typeof params.month === 'string' ? params.month : currentMonthStr()

  const { from: dateFrom, to: dateTo } = monthDateRange(month)

  const [{ data: transactions }, { data: wallets }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, type, amount, category_id, category:categories(name, icon)')
      .gte('date', dateFrom)
      .lte('date', dateTo),
    supabase
      .from('wallets')
      .select('id, name, currency, balance, is_primary')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
  ])

  return (
    <AnalyticsDashboard
      month={month}
      transactions={(transactions ?? []) as unknown as AnalyticsTransaction[]}
      wallets={wallets ?? []}
    />
  )
}

export interface AnalyticsTransaction {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: string | number
  category_id: string | null
  category: { name: string; icon: string | null } | null
}
