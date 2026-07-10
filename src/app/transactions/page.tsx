import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransactionList, type Transaction } from './transaction-list'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('group_id')
    .eq('id', user.id)
    .single()
  if (!profile?.group_id) redirect('/onboarding')

  const [{ data: transactions }, { data: wallets }, { data: categories }] = await Promise.all([
    supabase
      .from('transactions')
      .select(`
        id, type, amount, date, note, wallet_id, transfer_to_wallet_id,
        wallet:wallets!wallet_id(name, currency),
        transfer_to_wallet:wallets!transfer_to_wallet_id(name),
        category:categories(name, icon)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('wallets')
      .select('id, name, currency')
      .order('name'),
    supabase
      .from('categories')
      .select('id, name, icon')
      .or(`group_id.is.null,group_id.eq.${profile.group_id}`)
      .order('name'),
  ])

  return (
    <TransactionList
      transactions={(transactions ?? []) as unknown as Transaction[]}
      wallets={wallets ?? []}
      categories={categories ?? []}
      groupId={profile.group_id}
      currentUserId={user.id}
    />
  )
}
