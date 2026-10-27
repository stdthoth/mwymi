import { ArrowLeft } from 'lucide-react'
import type { Hex } from 'viem'
import { usePool } from '@/hooks/usePool'
import { JoinPoolCard } from './JoinPoolCard'
import { MockResultsPanel } from './MockResultsPanel'
import { PayoutBanner } from './PayoutBanner'
import { PickBoard } from './PickBoard'
import { PlayerList } from './PlayerList'
import { PoolAdmin } from './PoolAdmin'
import { PoolHero } from './PoolHero'
import { WeekHistory } from './WeekHistory'
import { Card } from './ui'

interface Props {
  poolId: bigint
  inviteCode: Hex | null
  onBack: () => void
}

export function PoolView({ poolId, inviteCode, onBack }: Props) {
  const { pool, players, weeks, myPlayer, claimable, isLoading, notFound } = usePool(poolId)

  const back = (
    <button type="button" onClick={onBack} className="mb-3 flex min-h-[44px] items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
      <ArrowLeft className="size-4" /> All pools
    </button>
  )

  if (notFound) {
    return (
      <>
        {back}
        <Card>
          <h2 className="display text-xl font-bold">Pool not found</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Pool #{poolId.toString()} does not exist on Arc Testnet. Check the invite link and try again.
          </p>
        </Card>
      </>
    )
  }

  if (isLoading || !pool) {
    return (
      <>
        {back}
        <div className="glass-card h-56 animate-pulse rounded-3xl" aria-busy="true" />
      </>
    )
  }

  const joined = Boolean(myPlayer?.joined)

  return (
    <div className="space-y-3">
      {back}
      <PoolHero pool={pool} players={players} />

      {pool.status === 'Open' && !joined && <JoinPoolCard pool={pool} playerCount={players.length} initialCode={inviteCode} />}

      {(pool.status === 'Open' || pool.status === 'Cancelled') && <PoolAdmin pool={pool} players={players} me={myPlayer} />}

      {pool.status === 'Active' && (
        <>
          {myPlayer?.alive ? (
            <PickBoard key={pool.currentWeek} pool={pool} me={myPlayer} />
          ) : (
            <Card>
              <h2 className="display text-lg font-bold">{joined ? 'You are out' : 'Spectating'}</h2>
              <p className="mt-1 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
                {joined
                  ? 'You were eliminated. You can keep watching the rest of the season.'
                  : 'Only players who joined before the season started can make picks.'}
              </p>
            </Card>
          )}
          <MockResultsPanel key={`res-${pool.currentWeek}`} pool={pool} />
        </>
      )}

      {pool.status === 'Finished' && <PayoutBanner pool={pool} me={myPlayer} claimable={claimable} />}

      <PlayerList pool={pool} players={players} />
      <WeekHistory weeks={weeks} />
    </div>
  )
}
