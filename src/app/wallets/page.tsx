import { requireProfile } from '@/lib/auth'
import { WalletList } from './wallet-list'

export default async function WalletsPage() {
  const { supabase, user, profile } = await requireProfile()

  const groupId = profile?.group_id ?? null

  const [{ data: wallets }, { data: bankPresets }, { data: members }] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, currency, balance, bank_preset_id, owner_id, group_id, is_primary')
      .order('created_at'),
    supabase
      .from('bank_presets')
      .select('id, name, type')
      .order('name'),
    groupId
      ? supabase.from('profiles').select('id, display_name').eq('group_id', groupId)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <WalletList
      wallets={wallets ?? []}
      bankPresets={bankPresets ?? []}
      members={(members ?? []) as { id: string; display_name: string }[]}
      currentUserId={user.id}
      groupId={groupId}
    />
  )
}
