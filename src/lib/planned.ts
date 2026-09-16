import { parseAmount } from './currency'

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 * Safe to call on both server and client.
 */
export function todayDateStr(): string {
  return new Date().toLocaleDateString('en-CA')
}

/**
 * Single source of truth for the "planned" check.
 * A transaction is planned when its date is strictly in the future (date > today).
 * A transaction dated today is settled.
 */
export function isPlanned(date: string | Date): boolean {
  const today   = todayDateStr()
  const dateStr = date instanceof Date ? date.toLocaleDateString('en-CA') : date
  return dateStr > today
}

type PlannedTx = {
  type:   string
  amount: string | number
  date:   string
}

/**
 * Computes the sum of planned income and planned expenses from a flat
 * transaction array. Transfers are excluded (same as wallet stats).
 *
 * Used wherever the secondary "projected" layer needs to be shown.
 */
export function getPlannedTotals(transactions: PlannedTx[]): {
  income:   number
  expenses: number
} {
  let income   = 0
  let expenses = 0

  for (const tx of transactions) {
    if (!isPlanned(tx.date)) continue
    const amt = parseAmount(tx.amount)
    if (tx.type === 'income')  income   += amt
    if (tx.type === 'expense') expenses += amt
  }

  return { income, expenses }
}
