'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

const LANGUAGE_LABELS: Record<Locale, string> = {
  en: 'English',
  uk: 'Українська',
  de: 'Deutsch',
}

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('settings')

  function switchLocale(next: Locale) {
    if (next === locale) return
    router.replace(pathname, { locale: next })
  }

  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('language')}
      </p>
      <div className="flex gap-2 flex-wrap">
        {routing.locales.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => switchLocale(code)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md border transition-colors',
              code === locale
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-input hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {LANGUAGE_LABELS[code]}
          </button>
        ))}
      </div>
    </section>
  )
}
