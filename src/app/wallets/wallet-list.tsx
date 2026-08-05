'use client'

import { useState } from 'react'
import { useTabState } from '@/hooks/use-tab-state'
import { useWalletRealtime } from '@/hooks/use-wallet-realtime'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { currencySymbol, formatAmount, parseAmount } from '@/lib/currency'
import { TabSwitcher } from '@/components/tab-switcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'UAH']

function WalletCard({
  wallet,
  preset,
  currentUserId,
  showOwner,
  onEdit,
  onDelete,
}: {
  wallet: Wallet
  preset: BankPreset | undefined
  currentUserId: string
  showOwner: boolean
  onEdit: (w: Wallet) => void
  onDelete: (w: Wallet) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{wallet.name}</CardTitle>
            {wallet.is_primary && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded border border-primary/40 text-primary bg-primary/10">
                Primary
              </span>
            )}
            {wallet.group_id ? (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded border border-muted text-muted-foreground">
                Shared
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded border border-dashed border-muted text-muted-foreground/60">
                Private
              </span>
            )}
          </div>
            {showOwner && wallet.owner?.display_name && (
              <span className="text-xs text-muted-foreground/70">{wallet.owner.display_name}</span>
            )}
          </div>
          {wallet.owner_id === currentUserId && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(wallet)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(wallet)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{preset?.name ?? 'Custom'}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono border rounded px-1.5 py-0.5 text-muted-foreground">
            {wallet.currency}
          </span>
          <span className="font-medium tabular-nums">
            {formatAmount(wallet.balance, wallet.currency)}
          </span>
        </div>
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

interface BankPreset { id: string; name: string; type: string }

interface Props {
  wallets: Wallet[]
  bankPresets: BankPreset[]
  currentUserId: string
  groupId: string | null
  groupName: string | null
}

export function WalletList({ wallets, bankPresets, currentUserId, groupId, groupName }: Props) {
  const router = useRouter()

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
      setDeleteError('Cannot delete a wallet with a non-zero balance. Transfer the balance out first.')
      return
    }
    if (deletingWallet.group_id !== null) {
      setDeleteError('Cannot delete a wallet that is shared with the group. Unshare it first.')
      return
    }

    setDeleteLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('wallets').delete().eq('id', deletingWallet.id)

    setDeleteLoading(false)

    if (error) {
      setDeleteError(
        error.code === '23503'
          ? 'Cannot delete a wallet that has transactions.'
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
        <h1 className="font-heading text-2xl font-semibold">Wallets</h1>
        <Button onClick={openCreate}>New wallet</Button>
      </div>

      {wallets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
          <p>No wallets yet.</p>
          <Button variant="outline" onClick={openCreate}>Add your first wallet</Button>
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
                tabs={[{ value: 'personal', label: 'Personal' }, { value: 'group', label: groupName ? groupName.slice(0, 50) : 'Group' }]}
                active={activeTab}
                onChange={v => changeTab(v as 'personal' | 'group')}
              />
            )}

            {/* Personal tab summary */}
            {(!groupId || activeTab === 'personal') && primaryWallet && (
              <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-x-4 gap-y-1 rounded-lg bg-muted/40 border px-4 py-2.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs uppercase tracking-wide">
                    {primaryWallet.is_primary ? 'Primary' : 'Main'}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatAmount(primaryWallet.balance, primaryWallet.currency)}
                  </span>
                  <span className="text-muted-foreground/60">{primaryWallet.name}</span>
                </div>
                {personalWallets.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs uppercase tracking-wide">All personal</span>
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
                  <span className="text-xs uppercase tracking-wide">Group total</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {primarySymbol} {groupTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {visibleWallets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {activeTab === 'group' ? 'No wallets shared with the group yet.' : 'No wallets yet.'}
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
            <DialogTitle className="font-heading">{isEdit ? 'Edit wallet' : 'New wallet'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="wallet-name">Name</Label>
              <Input
                id="wallet-name"
                placeholder="e.g. Jonas – Revolut"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={60}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-preset">Bank preset</Label>
              <select
                id="wallet-preset"
                value={presetId}
                onChange={e => setPresetId(e.target.value)}
                className="h-10 w-full border border-transparent border-b-input bg-transparent py-1 text-base text-foreground outline-none focus:border-b-ring md:text-sm disabled:opacity-50"
              >
                <option value="none">None / Custom</option>
                {bankPresets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-currency">Currency</Label>
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
                Set as primary wallet
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
                  Share with family group
                </Label>
              </div>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
                {loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save changes' : 'Create wallet')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingWallet} onOpenChange={v => { if (!v) setDeletingWallet(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deletingWallet?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
