import { Trophy } from 'lucide-react'
import { LMS_ADDRESS } from '@/config/arc'
import { lastManStandingAbi } from '@/abi/lastManStanding'
import { formatUsdc } from '@/lib/format'
import { useTx } from '@/hooks/useTx'
import type { PlayerData, PoolData } from '@/hooks/usePool'
import { Card, TxButton, TxStatus } from './ui'

interface Props {
  pool: PoolData
  me?: PlayerData
  claimable: bigint
}

export function PayoutBanner({ pool, me, claimable }: Props) {
  const tx = useTx()
  const iWon = Boolean(me?.isWinner)

  const claim = () =>
    void tx.send({ address: LMS_ADDRESS, abi: lastManStandingAbi, functionName: 'claim', args: [pool.id] })

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(26,128,71,0.12)' }}>
          <Trophy className="size-5" style={{ color: 'var(--success)' }} />
        </span>
        <div>
          <h2 className="display text-xl font-bold">
            {iWon ? 'You made it to the end' : 'The season is over'}
          </h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {pool.winnerCount === 1 ? 'One player was left standing.' : `${pool.winnerCount} players split the pot.`}{' '}
            Each share is about {formatUsdc(pool.winnerShare)} USDC.
          </p>
        </div>
      </div>

      {iWon && (
        <div className="mt-4">
          {me?.claimed ? (
            <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
              Your winnings were paid to your wallet.
            </p>
          ) : (
            <>
              <TxButton label={`Claim ${formatUsdc(claimable)} USDC`} onClick={claim} state={tx.state} disabled={claimable === 0n} />
              <TxStatus state={tx.state} />
            </>
          )}
        </div>
      )}
    </Card>
  )
}
