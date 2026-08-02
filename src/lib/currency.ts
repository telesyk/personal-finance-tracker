export const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', UAH: '₴',
}

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? currency
}

export function parseAmount(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) : v
}

export function formatAmount(amount: string | number, currency: string): string {
  return `${currencySymbol(currency)} ${parseAmount(amount).toFixed(2)}`
}
