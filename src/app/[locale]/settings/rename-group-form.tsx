'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function RenameGroupForm({ groupId, currentName }: { groupId: string; currentName: string }) {
  const router = useRouter()
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const unchanged = name.trim() === currentName || name.trim() === ''

  async function handleSave() {
    setLoading(true)
    setError(null)
    setSaved(false)
    const supabase = createClient()
    const { error } = await supabase
      .from('groups')
      .update({ name: name.trim() })
      .eq('id', groupId)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false) }}
          placeholder={t('groupName')}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={loading || unchanged}
        >
          {loading ? t('renaming') : saved ? tc('confirm') : t('rename')}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
