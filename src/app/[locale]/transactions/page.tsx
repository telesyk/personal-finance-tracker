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
  const month          = typeof params.month    === 'string' ? params.month    : currentMonthStr()
  const categoryFilter = typeof params.category === 'string' ? params.category : 'all'
  const { from: dateFrom, to: dateTo } = monthDateRange(month)

  const groupId = profile?.group_id ?? null

  const [{ data: transactions }, { data: wallets }, { data: categories }, { data: group }] = await Promise.all([
    supabase
      .from('transactions')
      .select(`
        id, type, amount, date, note, wallet_id, transfer_to_wallet_id, category_id,
        wallet:wallets!wallet_id(name, currency, owner_id, group_id),
        transfer_to_wallet:wallets!transfer_to_wallet_id(name),
        category:categories(name, icon)
      `)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('wallets')
      .select('id, name, currency, balance, is_primary, owner_id, group_id')
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('categories')
      .select('id, name, icon, type, parent_id')
      .order('name'),
    groupId
      ? supabase.from('groups').select('name').eq('id', groupId).single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <TransactionList
      transactions={(transactions ?? []) as unknown as Transaction[]}
      wallets={wallets ?? []}
      categories={categories ?? []}
      groupId={groupId}
      groupName={group?.name ?? null}
      currentUserId={user.id}
      month={month}
      categoryFilter={categoryFilter}
    />
  )
}
