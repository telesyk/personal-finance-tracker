'use client'

import { useState } from 'react'
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

export function GroupActions({ isSoleMember }: { isSoleMember: boolean }) {
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleLeave() {
    setLeaveError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ group_id: null })
      .eq('id', user.id)
    if (error) { setLeaveError(error.message); return }
    window.location.href = '/onboarding'
  }

  async function handleDelete() {
    setDeleteError(null)
    const supabase = createClient()
    const { error } = await supabase.rpc('delete_my_group')
    if (error) { setDeleteError(error.message); return }
    window.location.href = '/onboarding'
  }

  return (
    <div className="space-y-3">
      {/* Leave group — hidden for sole member */}
      {!isSoleMember && <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Leave group</p>
          <p className="text-xs text-muted-foreground">You will lose access to all group data.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">Leave</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave this group?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be removed from the group and lose access to all wallets and transactions. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeave}>Leave group</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>}
      {!isSoleMember && leaveError && <p className="text-xs text-red-600 dark:text-red-400">{leaveError}</p>}

      {/* Delete group — sole member only */}
      {isSoleMember && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete group</p>
              <p className="text-xs text-muted-foreground">Permanently deletes all wallets, transactions, and data.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this group?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All wallets, transactions, and categories in this group will be permanently deleted. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete group
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
