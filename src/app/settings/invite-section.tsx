'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function InviteSection() {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generateInvite() {
    setLoading(true)
    const supabase = createClient()
    const { data: token, error } = await supabase.rpc('generate_group_invite')
    setLoading(false)
    if (error || !token) return
    setLink(`${window.location.origin}/invite/${token}`)
  }

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      {link ? (
        <div className="flex gap-2">
          <Input value={link} readOnly className="font-mono text-xs" />
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={generateInvite} disabled={loading}>
          {loading ? 'Generating…' : 'Invite family member'}
        </Button>
      )}
      {link && (
        <p className="text-xs text-muted-foreground">Link expires in 7 days. Share it with one person.</p>
      )}
    </div>
  )
}
