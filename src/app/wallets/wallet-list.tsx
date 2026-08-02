'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { currencySymbol } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'UAH']

function formatBalance(balance: string | number, currency: string) {
  const amount = typeof balance === 'string' ? parseFloat(balance) : balance
  return `${currencySymbol(currency)} ${amount.toFixed(2)}`
}

function WalletCard({
  wallet,
  preset,
  currentUserId,
  onEdit,
  onDelete,
}: {
  wallet: Wallet
  preset: BankPreset | undefined
  currentUserId: string
  onEdit: (w: Wallet) => void
  onDelete: (w: Wallet) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
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
            {formatBalance(wallet.balance, wallet.currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function WalletSections({
  wallets,
  bankPresets,
  currentUserId,
  onEdit,
  onDelete,
}: {
  wallets: Wallet[]
  bankPresets: BankPreset[]
  currentUserId: string
  onEdit: (w: Wallet) => void
  onDelete: (w: Wallet) => void
}) {
  const mine = wallets.filter(w => w.owner_id === currentUserId)
  const shared = wallets.filter(w => w.owner_id !== currentUserId)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          My wallets
        </p>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wallets yet.</p>
        ) : (
          mine.map(wallet => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              preset={bankPresets.find(p => p.id === wallet.bank_preset_id)}
              currentUserId={currentUserId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {shared.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shared by others
          </p>
          {shared.map(wallet => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              preset={bankPresets.find(p => p.id === wallet.bank_preset_id)}
              currentUserId={currentUserId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface Wallet {
  id: string
  name: string
  currency: string
  balance: string | number
  bank_preset_id: string | null
  owner_id: string | null
  group_id: string | null
  is_primary: boolean
}

interface BankPreset { id: string; name: string; type: string }
interface Member { id: string; display_name: string }

interface Props {
  wallets: Wallet[]
  bankPresets: BankPreset[]
  members: Member[]
  currentUserId: string
  groupId: string | null
}

export function WalletList({ wallets, bankPresets, members, currentUserId, groupId }: Props) {
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

  async function handleSubmit(e: React.FormEvent) {
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
    setDeleteLoading(true)
    setDeleteError(null)

    const supabase = createClient()
    const { error } = await supabase.from('wallets').delete().eq('id', deletingWallet.id)

    setDeleteLoading(false)

    if (error) {
      // Postgres ON DELETE RESTRICT fires when the wallet has transactions
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
      ) : (
        <WalletSections
          wallets={wallets}
          bankPresets={bankPresets}
          currentUserId={currentUserId}
          onEdit={openEdit}
          onDelete={(wallet) => { setDeleteError(null); setDeletingWallet(wallet) }}
        />
      )}

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
