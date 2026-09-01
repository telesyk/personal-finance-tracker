import { parseAmount } from './currency'

export interface WalletStats {
  income: number   // sum of income transactions for the period
  savings: number  // income − expenses for the period
}

type StatsTx = {
  wallet_id: string
  type: string
  amount: string | number
}

/**
 * Aggregates per-wallet income and savings from a flat list of transactions.
 * Transfers are excluded — they move money between wallets, not in/out of the household.
 */
export function buildWalletStats(transactions: StatsTx[]): Record<string, WalletStats> {
  const stats: Record<string, WalletStats> = {}

  for (const tx of transactions) {
    const wid = tx.wallet_id
    if (!stats[wid]) stats[wid] = { income: 0, savings: 0 }
    const amt = parseAmount(tx.amount)

    if (tx.type === 'income') {
      stats[wid].income  += amt
      stats[wid].savings += amt
    } else if (tx.type === 'expense') {
      stats[wid].savings -= amt
    }
  }

  return stats
}
