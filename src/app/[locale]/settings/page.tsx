import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { requireProfile } from '@/lib/auth'
import { RenameGroupForm } from './rename-group-form'
import { InviteSection } from './invite-section'
import { GroupActions } from './group-actions'
import { LanguageSwitcher } from '@/components/language-switcher'

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireProfile()
  const t = await getTranslations('settings')

  if (!profile?.group_id) {
    return (
      <main className="w-full sm:max-w-lg sm:mx-auto p-4 sm:p-8 space-y-6">
        <h1 className="font-heading text-xl font-semibold">{t('title')}</h1>
        <div className="rounded-lg border border-dashed p-6 space-y-3 text-sm text-muted-foreground">
          <p>{t('noGroup')}</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors w-full sm:w-auto"
            >
              {t('createGroup')}
            </Link>
            <p className="text-xs">
              Already have an invite link?{' '}
              <span className="text-foreground">Open the link from your family member to join their group.</span>
            </p>
          </div>
        </div>
        <LanguageSwitcher />
      </main>
    )
  }

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, owner_id')
      .eq('id', profile.group_id)
      .single(),
    supabase
      .from('profiles')
      .select('id, display_name')
      .eq('group_id', profile.group_id)
      .order('display_name', { ascending: true }),
  ])

  return (
    <main className="w-full sm:max-w-lg sm:mx-auto p-4 sm:p-8 space-y-6">
      <h1 className="font-heading text-xl font-semibold">{t('title')}</h1>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('group')}</p>
        <RenameGroupForm groupId={group?.id ?? ''} currentName={group?.name ?? ''} />
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('members')} ({(members ?? []).length})
        </p>
        <div className="rounded-lg border divide-y">
          {(members ?? []).map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium">{m.display_name ?? 'Unnamed'}</p>
              {m.id === user.id && (
                <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">{t('you')}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('invite')}</p>
        <InviteSection />
      </section>

      <LanguageSwitcher />

      <section className="space-y-2 pt-2 border-t">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('dangerZone')}</p>
        <GroupActions
          isSoleMember={(members ?? []).length === 1}
          isOwner={group?.owner_id === user.id}
          otherMembers={(members ?? []).filter(m => m.id !== user.id)}
        />
      </section>
    </main>
  )
}
