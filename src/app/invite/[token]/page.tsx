import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinForm } from './join-form'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data: inviteInfo } = await supabase
    .rpc('get_invite_info', { invite_token: token })
    .single() as { data: { group_name: string; is_valid: boolean } | null }

  if (!inviteInfo) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Invalid invite</CardTitle>
            <CardDescription>
              This invite link is invalid, has already been used, or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-in">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">You're invited!</CardTitle>
            <CardDescription>
              Sign in or create an account to join <strong>{inviteInfo.group_name}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full">
              <Link href={`/sign-in?invite=${token}`}>Sign in</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/sign-up?invite=${token}`}>Create account</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('group_id')
    .eq('id', user.id)
    .single()

  if (profile?.group_id) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Already in a group</CardTitle>
            <CardDescription>You already belong to a group and cannot join another.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Join {inviteInfo.group_name}</CardTitle>
          <CardDescription>You've been invited to join this family group.</CardDescription>
        </CardHeader>
        <CardContent>
          <JoinForm token={token} groupName={inviteInfo.group_name} />
        </CardContent>
      </Card>
    </main>
  )
}
