import { requireProfile } from '@/lib/auth'
import { BudgetList, type Budget } from './budget-list'

export default async function BudgetPage() {
  const { supabase, user, profile } = await requireProfile()

  const groupId = profile?.group_id ?? null

  const [{ data: budgets }, { data: group }] = await Promise.all([
    supabase
      .from('budgets')
      .select('id, group_id, owner_id, category_id, amount, created_at, category:categories!category_id(id, name, icon, parent_id)')
      .order('created_at'),
    groupId
      ? supabase.from('groups').select('name').eq('id', groupId).single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <BudgetList
      budgets={(budgets ?? []) as unknown as Budget[]}
      currentUserId={user.id}
      groupId={groupId}
      groupName={group?.name ?? null}
    />
  )
}
