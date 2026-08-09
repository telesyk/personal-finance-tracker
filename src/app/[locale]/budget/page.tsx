import { requireProfile } from '@/lib/auth'
import { currentMonthRange } from '@/lib/date'
import { BudgetList, type Budget, type Actuals, type Category } from './budget-list'

export default async function BudgetPage() {
  const { supabase, user, profile } = await requireProfile()

  const groupId = profile?.group_id ?? null
  const { from, to } = currentMonthRange()

  const [{ data: budgets }, { data: group }, { data: txns }, { data: categories }] = await Promise.all([
    supabase
      .from('budgets')
      .select('id, group_id, owner_id, category_id, amount, created_at, category:categories!category_id(id, name, icon, parent_id)')
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
  ])

  // Aggregate actuals by category for each scope.
  // '__overall__' key covers the overall budget (category_id = null).
  //   Personal scope: only expenses from wallets owned by the current user.
  //   Group scope:    all expenses regardless of wallet owner.
  const personalActuals: Actuals = {}
  const groupActuals: Actuals    = {}

  for (const tx of txns ?? []) {
    const amount = parseFloat(tx.amount as unknown as string)
    const key    = tx.category_id ?? '__overall__'
    const wallet = tx.wallet as unknown as { owner_id: string | null } | null
    const isOwn  = wallet?.owner_id === user.id

    // Every expense counts toward the overall budget key
    groupActuals['__overall__']    = (groupActuals['__overall__'] ?? 0) + amount
    if (isOwn) personalActuals['__overall__'] = (personalActuals['__overall__'] ?? 0) + amount

    // Per-category (skip uncategorised transactions for per-category budgets)
    if (tx.category_id) {
      groupActuals[key]    = (groupActuals[key] ?? 0) + amount
      if (isOwn) personalActuals[key] = (personalActuals[key] ?? 0) + amount
    }
  }

  return (
    <BudgetList
      budgets={(budgets ?? []) as unknown as Budget[]}
      categories={(categories ?? []) as Category[]}
      currentUserId={user.id}
      groupId={groupId}
      groupName={group?.name ?? null}
      personalActuals={personalActuals}
      groupActuals={groupActuals}
    />
  )
}
