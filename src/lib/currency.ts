export const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', UAH: '₴',
}

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? currency
}

export function formatAmount(amount: string | number, currency: string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${currencySymbol(currency)} ${n.toFixed(2)}`
}
