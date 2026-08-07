import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { ProfileMenu } from './profile-menu'
import { ThemeToggle } from './theme-toggle'
import { LanguageSwitcher } from './language-switcher'
import { Link } from '@/i18n/navigation'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const t = await getTranslations('nav')

  return (
    <header className="border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-heading text-sm font-semibold tracking-wide">
          Finance Tracker
        </Link>
        <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/wallets" className="hover:text-foreground transition-colors">{t('wallets')}</Link>
          <Link href="/transactions" className="hover:text-foreground transition-colors">{t('transactions')}</Link>
          <Link href="/analytics" className="hover:text-foreground transition-colors">{t('analytics')}</Link>
          <Link href="/budget" className="hover:text-foreground transition-colors">{t('budget')}</Link>
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
        <ProfileMenu email={user.email ?? ''} />
      </div>
    </header>
  )
}
