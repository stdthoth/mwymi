import { formatUsdc } from '@/lib/format'
import type { PlayerData, PoolData } from '@/hooks/usePool'
import { Card, Stat, StatusBadge } from './ui'

export function PoolHero({ pool, players }: { pool: PoolData; players: PlayerData[] }) {
  const alive = players.filter((p) => p.alive).length
  const active = pool.status === 'Active'

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Pool #{pool.id.toString()}
        </span>
        <StatusBadge status={pool.status} />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="display text-5xl font-bold tabular-nums">{formatUsdc(pool.pot)}</span>
        <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>
          USDC
        </span>
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
        Total pot held in escrow. Last players standing split it.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Week" value={active ? `${pool.currentWeek}/${pool.totalWeeks}` : `${pool.totalWeeks} wks`} />
        <Stat label={active ? 'Alive' : 'Players'} value={active ? `${alive}/${players.length}` : players.length} />
        <Stat label="Buy-in" value={formatUsdc(pool.buyIn)} sub="USDC" />
      </div>

      {active && (
        <div className="mt-4 flex gap-1" aria-label={`Week ${pool.currentWeek} of ${pool.totalWeeks}`}>
          {Array.from({ length: pool.totalWeeks }, (_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: i < pool.currentWeek ? 'var(--accent)' : 'rgba(18,45,69,0.12)' }}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
