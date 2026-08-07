'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { LayoutDashboard, Wallet, ArrowLeftRight, BarChart2, PiggyBank } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  const NAV_ITEMS = [
    { href: '/dashboard'    as const, label: t('dashboard'),    icon: LayoutDashboard },
    { href: '/wallets'      as const, label: t('wallets'),      icon: Wallet },
    { href: '/transactions' as const, label: t('transactions'), icon: ArrowLeftRight },
    { href: '/analytics'   as const, label: t('analytics'),    icon: BarChart2 },
    { href: '/budget'      as const, label: t('budget'),       icon: PiggyBank },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
