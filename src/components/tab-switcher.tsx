'use client'

import { cn } from '@/lib/utils'

interface Tab {
  value: string
  label: string
}

interface Props {
  tabs: Tab[]
  active: string
  onChange: (value: string) => void
}

export function TabSwitcher({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-1 border-b">
      {tabs.map(tab => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            active === tab.value
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
