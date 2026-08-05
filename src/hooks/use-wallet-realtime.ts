'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribes to real-time changes on the wallets table and calls
 * router.refresh() whenever any wallet row visible to the current user
 * changes. This keeps wallet balances in sync across group members without
 * a manual page refresh.
 *
 * Requires the wallets table to be included in the supabase_realtime
 * publication (migration 20260805000000_wallets_realtime.sql).
 */
export function useWalletRealtime() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('wallets-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        () => router.refresh(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])
}
