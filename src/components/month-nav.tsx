'use client'

/**
 * Prev / label / Next month navigation buttons.
 * Pushes `${basePath}?month=YYYY-MM` on click.
 *
 * Used by: analytics-dashboard, budget-list, transaction-list
 */

import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { currentMonthStr, monthLabel, prevMonth, nextMonth } from '@/lib/date'

interface Props {
  month: string
  /** Base path without trailing slash — `?month=YYYY-MM` is appended */
  basePath: string
  /** Tailwind width/min-w class for the label span. Default: `'min-w-[7rem]'` */
  labelWidth?: string
}

export function MonthNav({ month, basePath, labelWidth = 'min-w-[7rem]' }: Props) {
  const router         = useRouter()
  const isCurrentMonth = month === currentMonthStr()

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => router.push(`${basePath}?month=${prevMonth(month)}`)}
        className="p-1.5 rounded hover:bg-muted transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className={cn('text-sm font-medium text-center', labelWidth)}>
        {monthLabel(month)}
      </span>

      <button
        onClick={() => router.push(`${basePath}?month=${nextMonth(month)}`)}
        disabled={isCurrentMonth}
        className={cn(
          'p-1.5 rounded transition-colors',
          isCurrentMonth ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:bg-muted',
        )}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
