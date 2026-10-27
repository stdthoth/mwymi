import { NFL_TEAMS } from '@/data/nflTeams'
import { maskHas } from '@/lib/mockSchedule'
import type { WeekData } from '@/hooks/usePool'
import { Card, SectionLabel } from './ui'

export function WeekHistory({ weeks }: { weeks: WeekData[] }) {
  const resolved = weeks.filter((w) => w.resolved).reverse()
  if (resolved.length === 0) return null

  return (
    <Card>
      <SectionLabel>Week by week</SectionLabel>
      <ul className="space-y-2">
        {resolved.map((w) => (
          <li key={w.week} className="glass-inner rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <span className="display text-sm font-bold">Week {w.week}</span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                {w.survivorsAfter} left standing
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {NFL_TEAMS.filter((t) => maskHas(w.winnersMask, t.id)).map((t) => (
                <span key={t.id} className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: t.color }}>
                  {t.abbr}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
