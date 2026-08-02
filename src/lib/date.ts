export function currentMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function currentMonthRange() {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${y}-${pad(m)}-01`
  const to = new Date(y, m, 0).toLocaleDateString('en-CA')
  const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  return { from, to, label }
}

export function monthDateRange(month: string): { from: string; to: string } {
  const [year, mon] = month.split('-').map(Number)
  return {
    from: `${month}-01`,
    to: new Date(year, mon, 0).toLocaleDateString('en-CA'),
  }
}

export function monthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function prevMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number)
  const d = new Date(year, mon - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function nextMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number)
  const d = new Date(year, mon, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
