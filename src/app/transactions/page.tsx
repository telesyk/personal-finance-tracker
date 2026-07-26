import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransactionList, type Transaction } from './transaction-list'

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function TransactionsPage({
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
  const dateTo = new Date(year, mon, 0).toLocaleDateString('en-CA')

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
      month={month}
    />
  )
}
