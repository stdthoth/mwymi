import { useMemo, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { LMS_ADDRESS } from '@/config/arc'
import { lastManStandingAbi } from '@/abi/lastManStanding'
import { teamById } from '@/data/nflTeams'
import { buildWinnersMask, randomOutcomes, weekSlate, type GameOutcome } from '@/lib/mockSchedule'
import { useTx } from '@/hooks/useTx'
import type { PoolData } from '@/hooks/usePool'
import { Card, SectionLabel, TxButton, TxStatus } from './ui'

export function MockResultsPanel({ pool }: { pool: PoolData }) {
  const tx = useTx()
  const slate = useMemo(() => weekSlate(Number(pool.id), pool.currentWeek), [pool.id, pool.currentWeek])
  const [outcomes, setOutcomes] = useState<Record<number, GameOutcome | undefined>>({})

  const decided = slate.filter((g) => outcomes[g.index] !== undefined).length
  const set = (index: number, o: GameOutcome) => setOutcomes((prev) => ({ ...prev, [index]: prev[index] === o ? undefined : o }))

  const resolve = () => {
    const mask = buildWinnersMask(slate, outcomes)
    void tx
      .send({ address: LMS_ADDRESS, abi: lastManStandingAbi, functionName: 'resolveWeek', args: [pool.id, mask] })
      .then((r) => {
        if (r) setOutcomes({})
      })
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>Mock results: week {pool.currentWeek}</SectionLabel>
        <button
          type="button"
          onClick={() => setOutcomes(randomOutcomes(slate))}
          className="btn-ghost -mt-3 flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
        >
          <Shuffle className="size-3.5" /> Randomize
        </button>
      </div>
      <p className="mb-3 text-xs text-pretty" style={{ color: 'var(--muted)' }}>
        Demo only. Anyone can set this week's winners and advance the pool. Games with no winner, or marked tie, count as a
        loss for anyone who picked them.
      </p>

      <ul className="space-y-2">
        {slate.map((g) => {
          const o = outcomes[g.index]
          const away = teamById(g.away)
          const home = teamById(g.home)
          const side = (team: typeof home, which: GameOutcome) => (
            <button
              type="button"
              onClick={() => set(g.index, which)}
              aria-pressed={o === which}
              className="display flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-bold"
              style={{
                background: o === which ? team.color : 'rgba(255,255,255,0.58)',
                color: o === which ? '#fff' : 'var(--ink)',
                border: `1px solid ${o === which ? team.color : 'var(--border)'}`,
              }}
            >
              {team.abbr}
            </button>
          )
          return (
            <li key={g.index} className="flex items-center gap-2">
              {side(away, 'away')}
              <button
                type="button"
                onClick={() => set(g.index, 'tie')}
                aria-pressed={o === 'tie'}
                aria-label="Tie"
                className="min-h-[44px] w-12 rounded-xl text-[11px] font-semibold"
                style={{
                  background: o === 'tie' ? 'var(--accent)' : 'rgba(255,255,255,0.58)',
                  color: o === 'tie' ? '#fff' : 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                Tie
              </button>
              {side(home, 'home')}
            </li>
          )
        })}
      </ul>

      <div className="mt-4">
        <TxButton label={`Resolve week ${pool.currentWeek} (${decided}/16 decided)`} onClick={resolve} state={tx.state} />
        <TxStatus state={tx.state} />
      </div>
    </Card>
  )
}
