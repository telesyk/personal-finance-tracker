import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Dashboard — {user?.email}</p>
    </main>
  )
}
