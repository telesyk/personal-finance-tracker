import { requireProfile } from '@/lib/auth'
import { currentMonthStr, monthDateRange } from '@/lib/date'
import { BudgetList, type Budget, type Actuals, type Category, type Wallet } from './budget-list'

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { supabase, user, profile } = await requireProfile()

  const groupId = profile?.group_id ?? null
  const params  = await searchParams
  const month   = typeof params.month === 'string' ? params.month : currentMonthStr()
  const { from, to } = monthDateRange(month)

  const [{ data: budgets }, { data: group }, { data: txns }, { data: categories }, { data: wallets }] = await Promise.all([
    supabase
      .from('budgets')
      .select('id, group_id, owner_id, category_id, amount, month, created_at, category:categories!category_id(id, name, icon, parent_id)')
      .eq('month', month)
      .order('created_at'),

    groupId
      ? supabase.from('groups').select('name').eq('id', groupId).single()
      : Promise.resolve({ data: null }),

    // Expense transactions this month — wallet join gives us owner_id for personal filtering
    supabase
      .from('transactions')
      .select('category_id, amount, wallet:wallets!wallet_id(owner_id)')
      .eq('type', 'expense')
      .gte('date', from)
      .lte('date', to),

    // Expense categories only — used by the Add / Edit form
    supabase
      .from('categories')
      .select('id, name, icon, type, parent_id')
      .eq('type', 'expense')
      .order('name'),

    // Wallets — used for budget total summary vs available balance
    supabase
      .from('wallets')
      .select('id, currency, balance, is_primary, owner_id, group_id')
      .order('is_primary', { ascending: false }),
  ])

  // Aggregate actuals by category for each scope.
  //   Personal scope: only expenses from wallets owned by the current user.
  //   Group scope:    all expenses regardless of wallet owner.
  const personalActuals: Actuals = {}
  const groupActuals: Actuals    = {}

  for (const tx of txns ?? []) {
    const amount = parseFloat(tx.amount as unknown as string)
    const wallet = tx.wallet as unknown as { owner_id: string | null } | null
    const isOwn  = wallet?.owner_id === user.id

    // Per-category only (skip uncategorised transactions)
    if (tx.category_id) {
      groupActuals[tx.category_id]    = (groupActuals[tx.category_id] ?? 0) + amount
      if (isOwn) personalActuals[tx.category_id] = (personalActuals[tx.category_id] ?? 0) + amount
    }
  }

  return (
    <BudgetList
      budgets={(budgets ?? []) as unknown as Budget[]}
      categories={(categories ?? []) as Category[]}
      wallets={(wallets ?? []) as Wallet[]}
      currentUserId={user.id}
      groupId={groupId}
      groupName={group?.name ?? null}
      month={month}
      personalActuals={personalActuals}
      groupActuals={groupActuals}
    />
  )
}
