/**
 * Mock NFL schedule. Every team plays every week (no byes) in 16 games.
 * Pairings are deterministic per (poolId, week) so every browser sees the same slate.
 */
export interface MockGame {
  index: number
  home: number
  away: number
}

export type GameOutcome = 'home' | 'away' | 'tie'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function weekSlate(poolId: number, week: number): MockGame[] {
  const rand = mulberry32(poolId * 7919 + week * 104729)
  const ids = Array.from({ length: 32 }, (_, i) => i)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return Array.from({ length: 16 }, (_, index) => ({
    index,
    home: ids[index * 2],
    away: ids[index * 2 + 1],
  }))
}

export function opponentOf(slate: MockGame[], teamId: number): number | undefined {
  for (const g of slate) {
    if (g.home === teamId) return g.away
    if (g.away === teamId) return g.home
  }
  return undefined
}

/** Build the uint32 winners mask from per-game outcomes. A tie sets no bit (counts as a loss). */
export function buildWinnersMask(slate: MockGame[], outcomes: Record<number, GameOutcome | undefined>): number {
  let mask = 0
  for (const g of slate) {
    const o = outcomes[g.index]
    if (o === 'home') mask |= 1 << g.home
    else if (o === 'away') mask |= 1 << g.away
  }
  return mask >>> 0
}

export function randomOutcomes(slate: MockGame[]): Record<number, GameOutcome> {
  const out: Record<number, GameOutcome> = {}
  for (const g of slate) out[g.index] = Math.random() < 0.5 ? 'home' : 'away'
  return out
}

export const maskHas = (mask: number, teamId: number) => ((mask >>> teamId) & 1) === 1
