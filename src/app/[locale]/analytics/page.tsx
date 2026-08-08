import { requireProfile } from '@/lib/auth'
import { currentMonthStr, monthDateRange } from '@/lib/date'
import { AnalyticsDashboard } from './analytics-dashboard'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { supabase, user, profile } = await requireProfile()

  const params = await searchParams
  const month = typeof params.month === 'string' ? params.month : currentMonthStr()

  const { from: dateFrom, to: dateTo } = monthDateRange(month)

  const groupId = profile?.group_id ?? null

  const [{ data: transactions }, { data: wallets }, { data: group }, { data: budgets }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, type, amount, category_id, wallet_id, category:categories(name, icon), wallet:wallets!wallet_id(owner_id, group_id)')
      .gte('date', dateFrom)
      .lte('date', dateTo),
    supabase
      .from('wallets')
      .select('id, name, currency, balance, is_primary, owner_id, group_id')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    groupId
      ? supabase.from('groups').select('name').eq('id', groupId).single()
      : Promise.resolve({ data: null }),
    // Budgets — used for the vs-budget section and overall KPI tile
    supabase.from('budgets').select('id, owner_id, category_id, amount'),
  ])

  return (
    <AnalyticsDashboard
      month={month}
      transactions={(transactions ?? []) as unknown as AnalyticsTransaction[]}
      wallets={wallets ?? []}
      groupId={groupId}
      groupName={group?.name ?? null}
      currentUserId={user.id}
      budgets={(budgets ?? []) as AnalyticsBudget[]}
    />
  )
}

export interface AnalyticsTransaction {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: string | number
  category_id: string | null
  wallet_id: string
  category: { name: string; icon: string | null } | null
  wallet: { owner_id: string | null; group_id: string | null } | null
}

export interface AnalyticsBudget {
  id: string
  owner_id: string | null   // null = group budget, uid = personal
  category_id: string | null // null = overall budget
  amount: string | number
}
