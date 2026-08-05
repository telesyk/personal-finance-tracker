'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Member { id: string; display_name: string | null }

interface Props {
  isSoleMember: boolean
  isOwner: boolean
  otherMembers: Member[]
}

export function GroupActions({ isSoleMember, isOwner, otherMembers }: Props) {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)

  async function handleTransfer() {
    if (!selectedMemberId) return
    setTransferLoading(true)
    setTransferError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('group_id')
      .eq('id', user.id)
      .single()

    const { error } = await supabase
      .from('groups')
      .update({ owner_id: selectedMemberId })
      .eq('id', profile?.group_id ?? '')

    setTransferLoading(false)
    if (error) { setTransferError(error.message); return }
    setTransferOpen(false)
    window.location.reload()
  }

  async function handleLeave() {
    setLeaveError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: unshareError } = await supabase
      .from('wallets')
      .update({ group_id: null })
      .eq('owner_id', user.id)
    if (unshareError) { setLeaveError(unshareError.message); return }

    const { error } = await supabase
      .from('profiles')
      .update({ group_id: null })
      .eq('id', user.id)
    if (error) { setLeaveError(error.message); return }
    window.location.href = '/dashboard'
  }

  async function handleDelete() {
    setDeleteError(null)
    const supabase = createClient()
    const { error } = await supabase.rpc('delete_my_group')
    if (error) { setDeleteError(error.message); return }
    window.location.href = '/dashboard'
  }

  return (
    <div className="space-y-3">
      {/* Transfer ownership — owner only, multi-member only */}
      {isOwner && !isSoleMember && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('transferOwnership')}</p>
            <p className="text-xs text-muted-foreground">{t('transferHint')}</p>
          </div>
          <Dialog open={transferOpen} onOpenChange={v => { setTransferOpen(v); if (!v) { setTransferError(null); setSelectedMemberId('') } }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">{t('transferTo')}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading">{t('transferOwnership')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Choose a member to become the new group owner. You will become a regular member and can then leave.
                </p>
                <select
                  value={selectedMemberId}
                  onChange={e => setSelectedMemberId(e.target.value)}
                  className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-base text-foreground outline-none focus:border-b-ring md:text-sm"
                >
                  <option value="">Select a member…</option>
                  {otherMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.display_name ?? 'Unnamed'}</option>
                  ))}
                </select>
                {transferError && <p className="text-sm text-destructive">{transferError}</p>}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleTransfer}
                  disabled={!selectedMemberId || transferLoading}
                  className="w-full"
                >
                  {transferLoading ? 'Transferring…' : t('transferConfirm')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Leave group — hidden for sole member; blocked for owner */}
      {!isSoleMember && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('leave')}</p>
            <p className="text-xs text-muted-foreground">
              {isOwner
                ? t('transferHint')
                : t('leaveDescription')}
            </p>
          </div>
          {isOwner ? (
            <Button variant="outline" size="sm" disabled>{t('leave')}</Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">{t('leave')}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('leaveConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('leaveDescription')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeave}>{t('leaveConfirm')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
      {!isSoleMember && leaveError && <p className="text-xs text-red-600 dark:text-red-400">{leaveError}</p>}

      {/* Delete group — sole member only */}
      {isSoleMember && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('delete')}</p>
              <p className="text-xs text-muted-foreground">{t('deleteDescription')}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">{t('delete')}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('deleteConfirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {deleteError && <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
        </>
      )}
    </div>
  )
}
