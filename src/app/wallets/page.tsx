import { requireProfile } from '@/lib/auth'
<<<<<<< HEAD
import { WalletList, type Wallet } from './wallet-list'
=======
import { WalletList } from './wallet-list'
>>>>>>> origin/main

export default async function WalletsPage() {
  const { supabase, user, profile } = await requireProfile()

  const groupId = profile?.group_id ?? null

<<<<<<< HEAD
  const [{ data: wallets }, { data: bankPresets }, { data: group }] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, currency, balance, bank_preset_id, owner_id, group_id, is_primary, owner:profiles!owner_id(display_name)')
=======
  const [{ data: wallets }, { data: bankPresets }] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, currency, balance, bank_preset_id, owner_id, group_id, is_primary')
>>>>>>> origin/main
      .order('created_at'),
    supabase
      .from('bank_presets')
      .select('id, name, type')
      .order('name'),
<<<<<<< HEAD
    groupId
      ? supabase.from('groups').select('name').eq('id', groupId).single()
      : Promise.resolve({ data: null }),
=======
>>>>>>> origin/main
  ])

  return (
    <WalletList
      wallets={(wallets ?? []) as unknown as Wallet[]}
      bankPresets={bankPresets ?? []}
      currentUserId={user.id}
      groupId={groupId}
<<<<<<< HEAD
      groupName={group?.name ?? null}
=======
>>>>>>> origin/main
    />
  )
}
