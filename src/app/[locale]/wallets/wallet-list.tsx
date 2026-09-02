'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTabState } from '@/hooks/use-tab-state'
import { useWalletRealtime } from '@/hooks/use-wallet-realtime'
import { useRouter } from '@/i18n/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { currencySymbol, formatAmount, parseAmount } from '@/lib/currency'
import type { WalletStats } from '@/lib/wallet-stats'
import { TabSwitcher } from '@/components/tab-switcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'UAH']

const ICON_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
]

function InstitutionIcon({ preset }: { preset: BankPreset | undefined }) {
  if (!preset) {
    return (
      <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
        ?
      </div>
    )
  }
  if (preset.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={preset.logo_url}
        alt={preset.name}
        className="h-11 w-11 rounded-full object-contain border bg-white shrink-0"
      />
    )
  }
  const initials  = preset.name.slice(0, 2).toUpperCase()
  const hash      = preset.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const colorClass = ICON_COLORS[hash % ICON_COLORS.length]
  return (
    <div className={cn('h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0', colorClass)}>
      {initials}
    </div>
  )
}

function WalletCard({
  wallet,
  preset,
  currentUserId,
  showOwner,
  stats,
  onEdit,
  onDelete,
}: {
  wallet: Wallet
  preset: BankPreset | undefined
  currentUserId: string
  showOwner: boolean
  stats: WalletStats | undefined
  onEdit: (w: Wallet) => void
  onDelete: (w: Wallet) => void
}) {
  // WalletCard is at module scope — it must own its translations rather than
  // relying on closure access to `t` declared inside WalletList.
  const t = useTranslations('wallets')
  return (
    <Card>
      <CardContent className="p-4">
        {/* Single row: institution icon · name-stack · balance+currency · actions */}
        <div className="flex items-center gap-3">
          <InstitutionIcon preset={preset} />
          {/* Name / badges / metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium text-sm leading-tight truncate">{wallet.name}</p>
              {wallet.is_primary && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded border border-primary/40 text-primary bg-primary/10 shrink-0">
                  {t('primary')}
                </span>
              )}
              {wallet.group_id ? (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded border border-muted text-muted-foreground shrink-0">
                  {t('shared')}
                </span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 rounded border border-dashed border-muted text-muted-foreground/60 shrink-0">
                  {t('private')}
                </span>
              )}
            </div>
            {showOwner && wallet.owner?.display_name && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">{wallet.owner.display_name}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{preset?.name ?? 'Custom'}</p>
          </div>
          {/* Balance — hero number, right side */}
          <div className="flex items-baseline gap-1.5 shrink-0">
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {formatAmount(wallet.balance, wallet.currency)}
            </p>
            <span className="text-xs font-mono border rounded px-1.5 py-0.5 text-muted-foreground">
              {wallet.currency}
            </span>
          </div>
          {/* Edit / delete — owner only */}
          {wallet.owner_id === currentUserId && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(wallet)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(wallet)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        {/* Monthly stats — only when there was activity this month */}
        {stats && (stats.income > 0 || stats.savings !== 0) && (
          <div className="mt-2 flex items-center gap-4 pl-14 text-xs text-muted-foreground">
            <span>
              ↑ {formatAmount(stats.income, wallet.currency)} this month
            </span>
            <span className={stats.savings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
              {stats.savings >= 0 ? '+' : '−'}{formatAmount(Math.abs(stats.savings), wallet.currency)} net
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


export interface Wallet {
  id: string
  name: string
  currency: string
  balance: string | number
  bank_preset_id: string | null
  owner_id: string | null
  group_id: string | null
  is_primary: boolean
  owner: { display_name: string } | null
}

export type { WalletStats } from '@/lib/wallet-stats'

interface BankPreset { id: string; name: string; type: string; logo_url: string | null }

interface Props {
  wallets: Wallet[]
  bankPresets: BankPreset[]
  currentUserId: string
  groupId: string | null
  groupName: string | null
  walletStats?: Record<string, WalletStats>
}

export function WalletList({ wallets, bankPresets, currentUserId, groupId, groupName, walletStats }: Props) {
  const router = useRouter()
  const t = useTranslations('wallets')
  const tf = useTranslations('wallets.form')
  const td = useTranslations('wallets.delete')
  const tc = useTranslations('common')

  // form dialog state
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // delete confirmation state
  const [deletingWallet, setDeletingWallet] = useState<Wallet | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // form fields
  const [name, setName] = useState('')
  const [presetId, setPresetId] = useState('none')
  const [currency, setCurrency] = useState('EUR')
  const [isPrimary, setIsPrimary] = useState(false)
  const [isShared, setIsShared] = useState(false)
  const { activeTab, changeTab } = useTabState(groupId)
  useWalletRealtime()

  function openCreate() {
    setEditingWallet(null)
    setName('')
    setPresetId('none')
    setCurrency('EUR')
    setIsPrimary(!wallets.some(w => w.is_primary))
    setIsShared(false)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(wallet: Wallet) {
    setEditingWallet(wallet)
    setName(wallet.name)
    setPresetId(wallet.bank_preset_id ?? 'none')
    setCurrency(wallet.currency)
    setIsPrimary(wallet.is_primary)
    setIsShared(wallet.group_id !== null)
    setFormError(null)
    setDialogOpen(true)
  }

  function handleDialogOpenChange(v: boolean) {
    setDialogOpen(v)
    if (!v) setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setFormError(null)

    const supabase = createClient()
    const payload = {
      name: name.trim(),
      bank_preset_id: presetId === 'none' ? null : presetId,
      currency,
      owner_id: currentUserId,
      is_primary: isPrimary,
      group_id: isShared && groupId ? groupId : null,
    }

    if (isPrimary) {
      const excludeId = editingWallet?.id
      let q = supabase.from('wallets').update({ is_primary: false }).eq('is_primary', true)
      if (excludeId) q = q.neq('id', excludeId)
      const { error: unsetError } = await q
      if (unsetError) {
        setFormError(unsetError.message)
        setLoading(false)
        return
      }
    }

    const { error } = editingWallet
      ? await supabase.from('wallets').update(payload).eq('id', editingWallet.id)
      : await supabase.from('wallets').insert(payload)

    setLoading(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setDialogOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!deletingWallet) return
    setDeleteError(null)

    if (parseAmount(deletingWallet.balance) !== 0) {
      setDeleteError(td('errorBalance'))
      return
    }
    if (deletingWallet.group_id !== null) {
      setDeleteError(td('errorShared'))
      return
    }

    setDeleteLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('wallets').delete().eq('id', deletingWallet.id)

    setDeleteLoading(false)

    if (error) {
      setDeleteError(
        error.code === '23503'
          ? td('errorTransactions')
          : error.message
      )
      return
    }

    setDeletingWallet(null)
    router.refresh()
  }

  const isEdit = editingWallet !== null

  return (
    <main className="w-full sm:max-w-2xl sm:mx-auto p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t('title')}</h1>
        <Button onClick={openCreate}>{t('new')}</Button>
      </div>

      {wallets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
          <p>{t('empty')}</p>
          <Button variant="outline" onClick={openCreate}>{t('addFirst')}</Button>
        </div>
      ) : (() => {
        const personalWallets = wallets.filter(w => w.owner_id === currentUserId)
        const groupWallets = wallets.filter(w => w.group_id !== null)
        const visibleWallets = !groupId || activeTab === 'personal' ? personalWallets : groupWallets
        const primaryWallet = personalWallets.find(w => w.is_primary) ?? personalWallets[0] ?? null
        const primarySymbol = primaryWallet ? currencySymbol(primaryWallet.currency) : ''
        const personalTotal = personalWallets.reduce((s, w) => s + parseAmount(w.balance), 0)
        const groupTotal = groupWallets.reduce((s, w) => s + parseAmount(w.balance), 0)

        return (
          <div className="space-y-4">
            {groupId && (
              <TabSwitcher
                tabs={[{ value: 'personal', label: t('tabPersonal') }, { value: 'group', label: groupName ? groupName.slice(0, 50) : t('tabGroup') }]}
                active={activeTab}
                onChange={v => changeTab(v as 'personal' | 'group')}
              />
            )}

            {/* Personal tab summary */}
            {(!groupId || activeTab === 'personal') && primaryWallet && (
              <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-x-4 gap-y-1 rounded-lg bg-muted/40 border px-4 py-2.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs uppercase tracking-wide">
                    {primaryWallet.is_primary ? t('primary') : t('primary')}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatAmount(primaryWallet.balance, primaryWallet.currency)}
                  </span>
                  <span className="text-muted-foreground/60">{primaryWallet.name}</span>
                </div>
                {personalWallets.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs uppercase tracking-wide">{t('allPersonal')}</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {primarySymbol} {personalTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Group tab summary */}
            {groupId && activeTab === 'group' && groupWallets.length > 0 && (
              <div className="flex items-center gap-x-4 rounded-lg bg-muted/40 border px-4 py-2.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs uppercase tracking-wide">{t('groupTotal')}</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {primarySymbol} {groupTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {visibleWallets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {activeTab === 'group' ? t('emptyGroup') : t('empty')}
              </p>
            ) : (
              <div className="space-y-3">
                {visibleWallets.map(wallet => (
                  <WalletCard
                    key={wallet.id}
                    wallet={wallet}
                    preset={bankPresets.find(p => p.id === wallet.bank_preset_id)}
                    currentUserId={currentUserId}
                    showOwner={!!groupId && activeTab === 'group'}
                    stats={walletStats?.[wallet.id]}
                    onEdit={openEdit}
                    onDelete={(w) => { setDeleteError(null); setDeletingWallet(w) }}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{isEdit ? tf('titleEdit') : tf('titleNew')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="wallet-name">{tf('name')}</Label>
              <Input
                id="wallet-name"
                placeholder={tf('namePlaceholder')}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={60}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-preset">{tf('bankPreset')}</Label>
              <select
                id="wallet-preset"
                value={presetId}
                onChange={e => setPresetId(e.target.value)}
                className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-base text-foreground outline-none focus:border-b-ring md:text-sm disabled:opacity-50"
              >
                <option value="none">{tf('bankPresetNone')}</option>
                {bankPresets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-currency">{tf('currency')}</Label>
              <select
                id="wallet-currency"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-base text-foreground outline-none focus:border-b-ring md:text-sm disabled:opacity-50"
              >
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="wallet-primary"
                type="checkbox"
                checked={isPrimary}
                onChange={e => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
              />
              <Label htmlFor="wallet-primary" className="cursor-pointer font-normal">
                {tf('setPrimary')}
              </Label>
            </div>

            {groupId && (
              <div className="flex items-center gap-2">
                <input
                  id="wallet-shared"
                  type="checkbox"
                  checked={isShared}
                  onChange={e => setIsShared(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                <Label htmlFor="wallet-shared" className="cursor-pointer font-normal">
                  {tf('shareWithGroup')}
                </Label>
              </div>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
                {loading ? (isEdit ? tc('saving') : tf('creating')) : (isEdit ? tf('submitEdit') : tf('submitNew'))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingWallet} onOpenChange={v => { if (!v) setDeletingWallet(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{td('title', { name: deletingWallet?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{td('description')}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? tc('deleting') : tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
