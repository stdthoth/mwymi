import { useAccount } from 'wagmi'
import { shortAddress } from '@/lib/format'
import type { PlayerData, PoolData } from '@/hooks/usePool'
import { Card, SectionLabel } from './ui'

function Chip({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: bg, color: fg }}>
      {text}
    </span>
  )
}

export function PlayerList({ pool, players }: { pool: PoolData; players: PlayerData[] }) {
  const { address } = useAccount()
  const started = pool.status === 'Active' || pool.status === 'Finished'

  return (
    <Card>
      <SectionLabel>Players ({players.length})</SectionLabel>
      <ul className="space-y-2">
        {players.map((p) => {
          const you = address?.toLowerCase() === p.address.toLowerCase()
          return (
            <li key={p.address} className="glass-inner flex min-h-[52px] items-center justify-between gap-3 rounded-2xl px-3 py-2">
              <div className="min-w-0">
                <div className="mono truncate text-sm">
                  {shortAddress(p.address)}
                  {you && <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--accent-hover)' }}>You</span>}
                  {p.address.toLowerCase() === pool.creator.toLowerCase() && (
                    <span className="ml-2 text-[11px]" style={{ color: 'var(--subtle)' }}>creator</span>
                  )}
                </div>
                {started && (
                  <div className="mt-1 flex items-center gap-1" aria-label={`${p.strikes} of 2 strikes`}>
                    {[0, 1].map((i) => (
                      <span key={i} className="size-2 rounded-full" style={{ background: i < p.strikes ? 'var(--danger)' : 'rgba(18,45,69,0.15)' }} />
                    ))}
                    <span className="ml-1 text-[11px]" style={{ color: 'var(--subtle)' }}>
                      strikes
                    </span>
                  </div>
                )}
              </div>
              {!started ? (
                <Chip text="Joined" bg="rgba(16,97,166,0.10)" fg="var(--accent-hover)" />
              ) : pool.status === 'Finished' && p.isWinner ? (
                <Chip text="Winner" bg="rgba(26,128,71,0.14)" fg="var(--success)" />
              ) : p.alive ? (
                <Chip text={p.currentPick > 0 ? 'Alive, picked' : 'Alive'} bg="rgba(26,128,71,0.12)" fg="var(--success)" />
              ) : (
                <Chip text="Out" bg="rgba(186,43,76,0.10)" fg="var(--danger)" />
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
