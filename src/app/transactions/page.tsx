import { requireProfile } from '@/lib/auth'
import { currentMonthStr, monthDateRange } from '@/lib/date'
import { TransactionList, type Transaction } from './transaction-list'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { supabase, user, profile } = await requireProfile()

  const params = await searchParams
  const month = typeof params.month === 'string' ? params.month : currentMonthStr()
  const { from: dateFrom, to: dateTo } = monthDateRange(month)

  const [{ data: transactions }, { data: wallets }, { data: categories }] = await Promise.all([
    supabase
      .from('transactions')
      .select(`
        id, type, amount, date, note, wallet_id, transfer_to_wallet_id, category_id,
        wallet:wallets!wallet_id(name, currency),
        transfer_to_wallet:wallets!transfer_to_wallet_id(name),
        category:categories(name, icon)
      `)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('wallets')
      .select('id, name, currency, balance, is_primary')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('categories')
      .select('id, name, icon, type')
      .order('name'),
  ])

  return (
    <TransactionList
      transactions={(transactions ?? []) as unknown as Transaction[]}
      wallets={wallets ?? []}
      categories={categories ?? []}
      groupId={profile?.group_id ?? null}
      currentUserId={user.id}
      month={month}
    />
  )
}
