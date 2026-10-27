import { useState } from 'react'
import { LMS_ADDRESS } from '@/config/arc'
import { lastManStandingAbi } from '@/abi/lastManStanding'
import { NFL_TEAMS, teamById } from '@/data/nflTeams'
import { opponentOf, weekSlate } from '@/lib/mockSchedule'
import { useTx } from '@/hooks/useTx'
import type { PlayerData, PoolData } from '@/hooks/usePool'
import { Card, SectionLabel, TxButton, TxStatus } from './ui'

export function PickBoard({ pool, me }: { pool: PoolData; me: PlayerData }) {
  const tx = useTx()
  const locked = me.currentPick > 0 ? me.currentPick - 1 : null
  const [selected, setSelected] = useState<number | null>(null)
  const choice = selected ?? locked
  const slate = weekSlate(Number(pool.id), pool.currentWeek)
  const usedCount = NFL_TEAMS.filter((t) => ((me.usedTeams >>> t.id) & 1) === 1).length

  const submit = () => {
    if (choice === null) return
    void tx.send({
      address: LMS_ADDRESS,
      abi: lastManStandingAbi,
      functionName: 'submitPick',
      args: [pool.id, choice],
    }).then((r) => {
      if (r) setSelected(null)
    })
  }

  return (
    <Card>
      <SectionLabel>Week {pool.currentWeek}: pick a winner</SectionLabel>

      {me.strikes > 0 && (
        <p className="mb-3 text-xs font-semibold" style={{ color: 'var(--danger)' }}>
          You have {me.strikes} of 2 strikes. One more missed pick and you are out.
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        {NFL_TEAMS.map((t) => {
          const used = ((me.usedTeams >>> t.id) & 1) === 1
          const isChoice = choice === t.id
          const opp = opponentOf(slate, t.id)
          return (
            <button
              key={t.id}
              type="button"
              disabled={used || tx.busy}
              onClick={() => setSelected(t.id)}
              aria-pressed={isChoice}
              aria-label={`${t.city} ${t.name}${used ? ', already used' : ''}`}
              className="relative flex min-h-[64px] flex-col items-center justify-center rounded-2xl p-1.5 transition-all disabled:cursor-not-allowed"
              style={{
                background: isChoice ? t.color : 'rgba(255,255,255,0.58)',
                color: isChoice ? '#fff' : 'var(--ink)',
                border: `1px solid ${isChoice ? t.color : 'var(--border)'}`,
                opacity: used ? 0.35 : 1,
              }}
            >
              <span className="absolute left-1.5 top-1.5 size-2 rounded-full" style={{ background: isChoice ? '#fff' : t.color }} />
              <span className="display text-sm font-bold">{t.abbr}</span>
              <span className="text-[10px] tabular-nums opacity-75">{used ? 'used' : opp !== undefined ? `vs ${teamById(opp).abbr}` : ''}</span>
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
        {usedCount} of 32 teams used. Each team can only win for you once. You can change your pick until the week is resolved.
      </p>

      <div className="mt-4">
        <TxButton
          label={
            choice === null
              ? 'Choose a team'
              : choice === locked && selected === null
                ? `Pick locked: ${teamById(choice).city} ${teamById(choice).name}`
                : `Lock in ${teamById(choice).city} ${teamById(choice).name}`
          }
          onClick={submit}
          state={tx.state}
          disabled={choice === null || (selected === null && locked !== null)}
        />
        <TxStatus state={tx.state} />
      </div>
    </Card>
  )
}
