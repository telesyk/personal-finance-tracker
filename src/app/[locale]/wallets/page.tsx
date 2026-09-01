import { requireProfile } from '@/lib/auth'
import { currentMonthStr, monthDateRange } from '@/lib/date'
import { buildWalletStats, type WalletStats } from '@/lib/wallet-stats'
import { WalletList, type Wallet } from './wallet-list'

export default async function WalletsPage() {
  const { supabase, user, profile } = await requireProfile()

  const groupId = profile?.group_id ?? null

  const month = currentMonthStr()
  const { from: dateFrom, to: dateTo } = monthDateRange(month)

  const [{ data: wallets }, { data: bankPresets }, { data: group }, { data: txRows }] = await Promise.all([
    supabase
      .from('wallets')
      .select('id, name, currency, balance, bank_preset_id, owner_id, group_id, is_primary, owner:profiles!owner_id(display_name)')
      .order('created_at'),
    supabase
      .from('bank_presets')
      .select('id, name, type, logo_url')
      .order('name'),
    groupId
      ? supabase.from('groups').select('name').eq('id', groupId).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('transactions')
      .select('wallet_id, type, amount')
      .gte('date', dateFrom)
      .lte('date', dateTo),
  ])

  const walletStats: Record<string, WalletStats> = buildWalletStats(txRows ?? [])

  return (
    <WalletList
      wallets={(wallets ?? []) as unknown as Wallet[]}
      bankPresets={bankPresets ?? []}
      currentUserId={user.id}
      groupId={groupId}
      groupName={group?.name ?? null}
      walletStats={walletStats}
    />
  )
}
