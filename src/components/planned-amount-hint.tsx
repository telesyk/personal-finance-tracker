import { cn } from '@/lib/utils'

interface Props {
  /** The projected figure (settled + planned). Renders nothing when 0. */
  amount:    number
  /** Used to format the label correctly for each context. */
  type:      'balance' | 'expenses' | 'income'
  /** Currency symbol, e.g. '€'. Defaults to '€'. */
  symbol?:   string
  className?: string
}

/**
 * Renders a secondary "projected" label next to a primary balance or total.
 * Returns null when amount is 0 — no planned transactions, nothing to show.
 */
export function PlannedAmountHint({ amount, type, symbol = '€', className }: Props) {
  if (amount === 0) return null

  const label =
    type === 'balance'
      ? `Projected: ${symbol} ${amount.toFixed(2)}`
      : `With planned: ${symbol} ${amount.toFixed(2)}`

  return (
    <span className={cn('text-xs text-muted-foreground tabular-nums', className)}>
      {label}
    </span>
  )
}
