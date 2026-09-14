import { requireProfile } from '@/lib/auth'
import { currentMonthStr, monthDateRange } from '@/lib/date'
import { todayDateStr } from '@/lib/planned'
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
  const walletFilter   = typeof params.wallet   === 'string' ? params.wallet   : 'all'
  const { from: dateFrom, to: dateTo } = monthDateRange(month)

  const groupId = profile?.group_id ?? null
  const today   = todayDateStr()

  // Shared select — used for both settled and planned queries
  const TX_SELECT = `
    id, type, amount, date, note, wallet_id, transfer_to_wallet_id, category_id,
    wallet:wallets!wallet_id(name, currency, owner_id, group_id),
    transfer_to_wallet:wallets!transfer_to_wallet_id(name),
    category:categories(name, icon)
  `

  const [
    { data: transactions },
    { data: plannedTxns },
    { data: wallets },
    { data: categories },
    { data: group },
  ] = await Promise.all([
    // Settled: dates in the month that are on or before today
    supabase
      .from('transactions')
      .select(TX_SELECT)
      .gte('date', dateFrom)
      .lte('date', today < dateTo ? today : dateTo)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),

    // Planned: dates in the month that are strictly after today
    supabase
      .from('transactions')
      .select(TX_SELECT)
      .gt('date', today)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: true })
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
      plannedTransactions={(plannedTxns ?? []) as unknown as Transaction[]}
      wallets={wallets ?? []}
      categories={categories ?? []}
      groupId={groupId}
      groupName={group?.name ?? null}
      currentUserId={user.id}
      month={month}
      categoryFilter={categoryFilter}
      walletFilter={walletFilter}
    />
  )
}
