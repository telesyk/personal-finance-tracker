import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RenameGroupForm } from './rename-group-form'
import { InviteSection } from './invite-section'
import { GroupActions } from './group-actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('group_id, display_name')
    .eq('id', user.id)
    .single()
  if (!profile?.group_id) redirect('/onboarding')

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name')
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
      <h1 className="font-heading text-xl font-semibold">Settings</h1>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group</p>
        <RenameGroupForm groupId={group?.id ?? ''} currentName={group?.name ?? ''} />
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Members ({(members ?? []).length})
        </p>
        <div className="rounded-lg border divide-y">
          {(members ?? []).map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium">{m.display_name ?? 'Unnamed'}</p>
              {m.id === user.id && (
                <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">You</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invite</p>
        <InviteSection />
      </section>

      <section className="space-y-2 pt-2 border-t">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Danger zone</p>
        <GroupActions isSoleMember={(members ?? []).length === 1} />
      </section>
    </main>
  )
}
