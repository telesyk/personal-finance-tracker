'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function JoinForm({ token, groupName }: { token: string; groupName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.rpc('join_group_via_invite', { invite_token: token })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" onClick={handleJoin} disabled={loading}>
        {loading ? 'Joining…' : `Join ${groupName}`}
      </Button>
    </div>
  )
}
