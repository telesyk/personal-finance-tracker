/**
 * Shared helpers for budget percentage display.
 * Used by: analytics-dashboard, budget-list, dashboard-budget-tabs.
 *
 * warnThreshold — amber kicks in at this pct (default 80; overall KPI uses 70)
 */

export function budgetBarColor(pct: number, warnThreshold = 80): string {
  return pct >= 100 ? 'bg-destructive' : pct >= warnThreshold ? 'bg-amber-500' : 'bg-emerald-500'
}

export function budgetLabelClass(pct: number, warnThreshold = 80): string {
  return pct >= 100
    ? 'text-destructive'
    : pct >= warnThreshold
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-muted-foreground'
}
