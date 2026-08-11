'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Wallet   { id: string; name: string; is_primary: boolean }
interface Category { id: string; name: string; icon: string | null; type: 'income' | 'expense' | null; parent_id: string | null }

type TxType = 'income' | 'expense' | 'transfer'

function todayLocal() {
  return new Date().toLocaleDateString('en-CA')
}

export function QuickAddFab() {
  const router = useRouter()
  const t  = useTranslations('transactions')
  const tf = useTranslations('transactions.form')
  const tc = useTranslations('common')

  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Remote data
  const [wallets, setWallets]         = useState<Wallet[]>([])
  const [categories, setCategories]   = useState<Category[]>([])
  const [currentUserId, setUserId]    = useState<string>('')
  const [dataReady, setDataReady]     = useState(false)

  // Form fields
  const [type, setType]           = useState<TxType>('expense')
  const [walletId, setWalletId]   = useState('')
  const [amount, setAmount]       = useState('')
  const [categoryId, setCategoryId] = useState('none')
  const [toWalletId, setToWalletId] = useState('')
  const [date, setDate]           = useState(todayLocal())
  const [note, setNote]           = useState('')

  // Fetch wallets + categories once on mount
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.auth.getUser(),
      supabase.from('wallets').select('id, name, is_primary').order('is_primary', { ascending: false }),
      supabase.from('categories').select('id, name, icon, type, parent_id').order('name'),
    ]).then(([{ data: { user } }, { data: ws }, { data: cats }]) => {
      const walletList = ws ?? []
      setWallets(walletList)
      setCategories(cats ?? [])
      setUserId(user?.id ?? '')
      setWalletId(walletList[0]?.id ?? '')
      setDataReady(true)
    })
  }, [])

  function openDialog() {
    setType('expense')
    setWalletId(wallets[0]?.id ?? '')
    setAmount('')
    setCategoryId('none')
    setToWalletId('')
    setDate(todayLocal())
    setNote('')
    setFormError(null)
    setOpen(true)
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const n = parseFloat(amount)
    if (!isFinite(n) || n <= 0) {
      setFormError(tf('errors.positiveAmount'))
      return
    }
    if (type === 'transfer' && !toWalletId) {
      setFormError(tf('errors.selectDestination'))
      return
    }
    if (type === 'transfer' && toWalletId === walletId) {
      setFormError(tf('errors.sameWallet'))
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('transactions').insert({
      type,
      wallet_id: walletId,
      amount: n,
      category_id: type !== 'transfer' && categoryId !== 'none' ? categoryId : null,
      transfer_to_wallet_id: type === 'transfer' ? toWalletId : null,
      date,
      note: note.trim() || null,
      created_by: currentUserId,
    })
    setLoading(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setOpen(false)
    router.refresh()
  }

  const filteredCategories   = categories.filter(c => c.type === type)
  const parentCategories     = filteredCategories.filter(c => !c.parent_id)
  const childCategories      = filteredCategories.filter(c =>  c.parent_id)
  const toWalletOptions      = wallets.filter(w => w.id !== walletId)
  const selectClass          = 'h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-base text-foreground outline-none focus:border-b-ring md:text-sm disabled:opacity-50'

  return (
    <>
      {/* FAB — mobile only, above bottom nav */}
      <button
        onClick={openDialog}
        aria-label={t('add')}
        className={cn(
          'md:hidden fixed bottom-20 right-4 z-40',
          'h-14 w-14 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'flex items-center justify-center',
          'hover:opacity-90 active:scale-95 transition-all',
          !dataReady && 'opacity-50 pointer-events-none',
        )}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Add transaction dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{tf('titleNew')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Type selector */}
            <div className="space-y-2">
              <Label>{tf('type')}</Label>
              <div className="flex rounded-md border overflow-hidden">
                {(['expense', 'income', 'transfer'] as TxType[]).map(txType => (
                  <button
                    key={txType}
                    type="button"
                    onClick={() => { setType(txType); setCategoryId('none') }}
                    className={cn(
                      'flex-1 py-2 text-sm font-medium capitalize transition-colors',
                      type === txType
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t(`types.${txType}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* From wallet */}
            <div className="space-y-2">
              <Label htmlFor="fab-wallet">{type === 'transfer' ? tf('fromWallet') : tf('wallet')}</Label>
              <select
                id="fab-wallet"
                value={walletId}
                onChange={e => setWalletId(e.target.value)}
                required
                className={selectClass}
              >
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* To wallet (transfer only) */}
            {type === 'transfer' && (
              <div className="space-y-2">
                <Label htmlFor="fab-to-wallet">{tf('toWallet')}</Label>
                <select
                  id="fab-to-wallet"
                  value={toWalletId}
                  onChange={e => setToWalletId(e.target.value)}
                  required
                  className={selectClass}
                >
                  <option value="">{tf('toWalletPlaceholder')}</option>
                  {toWalletOptions.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="fab-amount">{tf('amount')}</Label>
              <Input
                id="fab-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(',', '.'))}
                required
                autoFocus
              />
            </div>

            {/* Category (income / expense only) */}
            {type !== 'transfer' && (
              <div className="space-y-2">
                <Label htmlFor="fab-category">{tf('category')}</Label>
                <select
                  id="fab-category"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className={selectClass}
                >
                  <option value="none">{tf('categoryNone')}</option>
                  {parentCategories.map(parent => {
                    const children = childCategories.filter(c => c.parent_id === parent.id)
                    if (children.length === 0) {
                      return (
                        <option key={parent.id} value={parent.id}>
                          {parent.icon ? `${parent.icon} ${parent.name}` : parent.name}
                        </option>
                      )
                    }
                    return (
                      <optgroup key={parent.id} label={parent.icon ? `${parent.icon} ${parent.name}` : parent.name}>
                        {children.map(child => (
                          <option key={child.id} value={child.id}>
                            {child.icon ? `${child.icon} ${child.name}` : child.name}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="fab-date">{tf('date')}</Label>
              <Input
                id="fab-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="fab-note">
                {tf('note')} <span className="text-muted-foreground font-normal">({tc('optional')})</span>
              </Label>
              <Textarea
                id="fab-note"
                placeholder="e.g. Monthly groceries"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                maxLength={200}
              />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading || !walletId || !amount}>
                {loading ? tf('adding') : tf('submitNew')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
