import { requireProfile } from '@/lib/auth'
import { currentMonthStr, monthDateRange } from '@/lib/date'
import { todayDateStr, getPlannedTotals } from '@/lib/planned'
import { buildWalletStats, type WalletStats } from '@/lib/wallet-stats'
import { WalletList, type Wallet } from './wallet-list'

export default async function WalletsPage() {
  const { supabase, user, profile } = await requireProfile()

  const groupId = profile?.group_id ?? null

  const month = currentMonthStr()
  const { from: dateFrom, to: dateTo } = monthDateRange(month)
  const today = todayDateStr()

  const [{ data: wallets }, { data: bankPresets }, { data: group }, { data: txRows }, { data: plannedRows }] = await Promise.all([
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
    // Settled: current month transactions (for monthly stats on each card)
    supabase
      .from('transactions')
      .select('wallet_id, type, amount')
      .gte('date', dateFrom)
      .lte('date', dateTo),
    // Planned: ALL future transactions (for balance projection on each card)
    supabase
      .from('transactions')
      .select('wallet_id, type, amount, date')
      .gt('date', today),
  ])

  const walletStats: Record<string, WalletStats> = buildWalletStats(txRows ?? [])

  // Per-wallet planned income / expenses totals (all future dates)
  const walletPlannedTotals: Record<string, { income: number; expenses: number }> = {}
  for (const row of plannedRows ?? []) {
    const wid = (row as any).wallet_id as string
    if (!walletPlannedTotals[wid]) walletPlannedTotals[wid] = { income: 0, expenses: 0 }
    const totals = getPlannedTotals([row as any])
    walletPlannedTotals[wid].income   += totals.income
    walletPlannedTotals[wid].expenses += totals.expenses
  }

  return (
    <WalletList
      wallets={(wallets ?? []) as unknown as Wallet[]}
      bankPresets={bankPresets ?? []}
      currentUserId={user.id}
      groupId={groupId}
      groupName={group?.name ?? null}
      walletStats={walletStats}
      walletPlannedTotals={walletPlannedTotals}
    />
  )
}
