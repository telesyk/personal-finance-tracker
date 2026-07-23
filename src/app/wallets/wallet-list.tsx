'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'UAH']

const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', UAH: '₴',
}

function formatBalance(balance: string | number, currency: string) {
  const amount = typeof balance === 'string' ? parseFloat(balance) : balance
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  return `${symbol} ${amount.toFixed(2)}`
}

interface Wallet {
  id: string
  name: string
  currency: string
  balance: string | number
  bank_preset_id: string | null
  owner_id: string | null
  is_primary: boolean
}

interface BankPreset { id: string; name: string; type: string }
interface Member { id: string; display_name: string }

interface Props {
  wallets: Wallet[]
  bankPresets: BankPreset[]
  members: Member[]
  currentUserId: string
  groupId: string
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
  const [ownerId, setOwnerId] = useState(currentUserId)
  const [isPrimary, setIsPrimary] = useState(false)

  function openCreate() {
    setEditingWallet(null)
    setName('')
    setPresetId('none')
    setCurrency('EUR')
    setOwnerId(currentUserId)
    setIsPrimary(!wallets.some(w => w.is_primary))
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(wallet: Wallet) {
    setEditingWallet(wallet)
    setName(wallet.name)
    setPresetId(wallet.bank_preset_id ?? 'none')
    setCurrency(wallet.currency)
    setOwnerId(wallet.owner_id ?? currentUserId)
    setIsPrimary(wallet.is_primary)
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
      owner_id: ownerId,
      is_primary: isPrimary,
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
      : await supabase.from('wallets').insert({ ...payload, group_id: groupId })

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
    <main className="max-w-2xl mx-auto p-8 space-y-6">
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
        <div className="space-y-3">
          {wallets.map(wallet => {
            const preset = bankPresets.find(p => p.id === wallet.bank_preset_id)
            return (
              <Card key={wallet.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{wallet.name}</CardTitle>
                      {wallet.is_primary && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded border border-primary/40 text-primary bg-primary/10">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(wallet)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => { setDeleteError(null); setDeletingWallet(wallet) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
          })}
        </div>
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
              <Label>Bank preset</Label>
              <Select value={presetId} onValueChange={setPresetId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None / Custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Custom</SelectItem>
                  {bankPresets.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {members.length > 1 && (
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
