'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  return `${symbol} ${amount.toFixed(2)}`
}

interface Wallet {
  id: string
  name: string
  currency: string
  balance: string | number
  bank_preset_id: string | null
  owner_id: string | null
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
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [presetId, setPresetId] = useState('none')
  const [currency, setCurrency] = useState('EUR')
  const [ownerId, setOwnerId] = useState(currentUserId)

  function resetForm() {
    setName('')
    setPresetId('none')
    setCurrency('EUR')
    setOwnerId(currentUserId)
    setError(null)
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('wallets').insert({
      name: name.trim(),
      group_id: groupId,
      bank_preset_id: presetId === 'none' ? null : presetId,
      currency,
      owner_id: ownerId,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setOpen(false)
    resetForm()
    router.refresh()
  }

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Wallets</h1>
        <Button onClick={() => setOpen(true)}>New wallet</Button>
      </div>

      {wallets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
          <p>No wallets yet.</p>
          <Button variant="outline" onClick={() => setOpen(true)}>Add your first wallet</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map(wallet => {
            const preset = bankPresets.find(p => p.id === wallet.bank_preset_id)
            return (
              <Card key={wallet.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{wallet.name}</CardTitle>
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

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">New wallet</DialogTitle>
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
                {loading ? 'Creating…' : 'Create wallet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}
