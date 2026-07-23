import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WalletList } from './wallet-list'

export default async function WalletsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('group_id')
    .eq('id', user.id)
    .single()
  if (!profile?.group_id) redirect('/onboarding')

  const [{ data: wallets }, { data: bankPresets }, { data: members }] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, currency, balance, bank_preset_id, owner_id, is_primary')
      .order('created_at'),
    supabase
      .from('bank_presets')
      .select('id, name, type')
      .order('name'),
    supabase
      .from('profiles')
      .select('id, display_name')
      .eq('group_id', profile.group_id),
  ])

  return (
    <WalletList
      wallets={wallets ?? []}
      bankPresets={bankPresets ?? []}
      members={members ?? []}
      currentUserId={user.id}
      groupId={profile.group_id}
    />
  )
}
