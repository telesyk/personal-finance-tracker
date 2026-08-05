'use client'

import { useState, useEffect } from 'react'

const KEY = 'ft-active-tab'

export function useTabState(groupId: string | null) {
  const [activeTab, setActiveTab] = useState<'personal' | 'group'>('personal')

  useEffect(() => {
    if (!groupId) return
    const stored = localStorage.getItem(KEY)
    if (stored === 'personal' || stored === 'group') setActiveTab(stored)
  }, [groupId])

  function changeTab(tab: 'personal' | 'group') {
    setActiveTab(tab)
    if (typeof window !== 'undefined') localStorage.setItem(KEY, tab)
  }

  return { activeTab, changeTab }
}
