import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsDashboard } from './analytics-dashboard'

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('group_id')
    .eq('id', user.id)
    .single()
  if (!profile?.group_id) redirect('/onboarding')

  const params = await searchParams
  const month = typeof params.month === 'string' ? params.month : currentMonthStr()

  const [year, mon] = month.split('-').map(Number)
  const dateFrom = `${month}-01`
  const dateTo = new Date(year, mon, 0).toLocaleDateString('en-CA') // last day of month

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
