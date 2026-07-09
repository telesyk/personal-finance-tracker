'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OnboardingForm() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Your session has expired. Please sign out and sign back in.')
      setLoading(false)
      return
    }

    const { data: groupId, error: rpcError } = await supabase.rpc('create_group_and_join', { group_name: name.trim() })

    if (rpcError) {
      const msg = rpcError.message ?? ''
      if (msg.includes('Not authenticated')) {
        setError('Your session has expired. Please sign out and sign back in.')
      } else if (msg.includes('Profile link failed')) {
        setError(`Group created but account link failed: ${msg}. Please sign out and sign back in.`)
      } else if (msg.includes('fkey') || msg.includes('foreign key') || msg.includes('violates')) {
        setError('Your account setup is incomplete. Please sign out and sign back in — the issue will resolve on next login.')
      } else {
        setError(`Could not create group: ${msg || 'unknown error'}. Please try again.`)
      }
      setLoading(false)
      return
    }

    // Read the profile back from the client to confirm the DB function actually
    // committed the group_id. This catches the case where the function returned
    // success but the UPDATE silently wrote NULL (e.g. new_group_id was NULL).
    const { data: profile } = await supabase
      .from('profiles')
      .select('group_id')
      .eq('id', user.id)
      .single()

    if (!profile?.group_id) {
      // DB function did not link the profile — try a direct client-side update.
      if (!groupId) {
        setError('Group was created but its ID could not be determined. Please refresh and try again.')
        setLoading(false)
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ group_id: groupId })
        .eq('id', user.id)

      if (updateError) {
        setError(`Account link failed: ${updateError.message}. Please sign out and sign back in.`)
        setLoading(false)
        return
      }

      // Confirm the write landed before navigating.
      const { data: verified } = await supabase
        .from('profiles')
        .select('group_id')
        .eq('id', user.id)
        .single()

      if (!verified?.group_id) {
        setError('Could not link your account to the group. Please sign out and sign back in.')
        setLoading(false)
        return
      }
    }

    window.location.href = '/dashboard'
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Create your family group</CardTitle>
        <CardDescription>Give your group a name — you can invite others later.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group name</Label>
            <Input
              id="name"
              placeholder="e.g. The Smiths"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              minLength={2}
              maxLength={50}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? 'Creating…' : 'Create group'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
