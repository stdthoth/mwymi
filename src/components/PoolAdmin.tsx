import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Check, Copy } from 'lucide-react'
import { LMS_ADDRESS } from '@/config/arc'
import { lastManStandingAbi } from '@/abi/lastManStanding'
import { buildInviteLink } from '@/lib/invite'
import { loadInviteCode } from '@/lib/inviteStore'
import { formatUsdc } from '@/lib/format'
import { useTx } from '@/hooks/useTx'
import type { PlayerData, PoolData } from '@/hooks/usePool'
import { Card, SectionLabel, TxButton, TxStatus } from './ui'

const OPEN_TIMEOUT_SECONDS = 3 * 24 * 60 * 60

/** Open and cancelled pool controls: invite link, start, cancel, refund. */
export function PoolAdmin({ pool, players, me }: { pool: PoolData; players: PlayerData[]; me?: PlayerData }) {
  const { address } = useAccount()
  const startTx = useTx()
  const cancelTx = useTx()
  const refundTx = useTx()
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isCreator = address?.toLowerCase() === pool.creator.toLowerCase()
  const open = pool.status === 'Open'
  const timedOut = open && Date.now() / 1000 > pool.createdAt + OPEN_TIMEOUT_SECONDS

  useEffect(() => {
    if (!isCreator || !open) return
    const code = loadInviteCode(pool.id)
    if (code) void buildInviteLink(pool.id, code).then(setLink)
  }, [isCreator, open, pool.id])

  const copy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const call = (tx: ReturnType<typeof useTx>, functionName: 'startPool' | 'cancelPool' | 'refund') =>
    void tx.send({ address: LMS_ADDRESS, abi: lastManStandingAbi, functionName, args: [pool.id] })

  if (pool.status === 'Cancelled') {
    const canRefund = me?.joined && !me.refunded
    return (
      <Card>
        <SectionLabel>Pool cancelled</SectionLabel>
        <p className="text-sm text-pretty" style={{ color: 'var(--muted)' }}>
          This pool never started. Every player can take their {formatUsdc(pool.buyIn)} USDC buy-in back.
        </p>
        {canRefund ? (
          <div className="mt-4">
            <TxButton label={`Refund ${formatUsdc(pool.buyIn)} USDC`} onClick={() => call(refundTx, 'refund')} state={refundTx.state} />
            <TxStatus state={refundTx.state} />
          </div>
        ) : (
          me?.refunded && (
            <p className="mt-3 text-xs font-semibold" style={{ color: 'var(--success)' }}>
              Your buy-in was refunded.
            </p>
          )
        )}
      </Card>
    )
  }

  if (!open) return null

  return (
    <Card>
      <SectionLabel>Waiting for players</SectionLabel>
      {isCreator && (
        <div className="glass-inner mb-3 rounded-2xl p-3">
          <div className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>
            Invite link
          </div>
          {link ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="mono min-w-0 flex-1 truncate text-xs">{link}</span>
              <button type="button" onClick={() => void copy()} className="btn-ghost flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold">
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              The invite code lives in the browser that created this pool. Open the pool there to copy the link.
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        {players.length} joined. {players.length < 2 ? 'At least 2 players are needed to start.' : 'Ready to start whenever the group is in.'}
      </p>

      {isCreator && (
        <div className="mt-4 space-y-2">
          <TxButton label="Start the season" onClick={() => call(startTx, 'startPool')} state={startTx.state} disabled={players.length < 2} />
          <TxStatus state={startTx.state} />
        </div>
      )}
      {(isCreator || timedOut) && (
        <div className="mt-2">
          <TxButton
            variant="ghost"
            label={isCreator ? 'Cancel pool and enable refunds' : 'Cancel stale pool and enable refunds'}
            onClick={() => call(cancelTx, 'cancelPool')}
            state={cancelTx.state}
          />
          <TxStatus state={cancelTx.state} />
        </div>
      )}
    </Card>
  )
}
