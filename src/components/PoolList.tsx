import { ChevronRight } from 'lucide-react'
import { formatUsdc } from '@/lib/format'
import { useMyPools } from '@/hooks/useMyPools'
import { Card, SectionLabel, StatusBadge } from './ui'

export function PoolList({ onOpen }: { onOpen: (id: bigint) => void }) {
  const { pools, isLoading } = useMyPools()

  return (
    <Card>
      <SectionLabel>My pools</SectionLabel>
      {isLoading && pools.length === 0 ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="glass-inner h-16 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : pools.length === 0 ? (
        <p className="text-sm text-pretty" style={{ color: 'var(--muted)' }}>
          No pools yet. Create one above, then share the invite link with your group.
        </p>
      ) : (
        <ul className="space-y-2">
          {pools.map((p) => (
            <li key={p.id.toString()}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                className="glass-inner flex min-h-[64px] w-full items-center justify-between gap-3 rounded-2xl p-3 text-left"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="display text-base font-bold">Pool #{p.id.toString()}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-0.5 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                    {formatUsdc(p.pot)} USDC pot
                    {p.status === 'Active' ? ` · Week ${p.currentWeek} of ${p.totalWeeks}` : ` · ${p.totalWeeks} weeks`}
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
