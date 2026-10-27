import { useMemo } from 'react'
import type { Address } from 'viem'
import { useAccount, useReadContracts } from 'wagmi'
import { ARC_CHAIN_ID, LMS_ADDRESS } from '@/config/arc'
import { lastManStandingAbi } from '@/abi/lastManStanding'

export const POOL_STATUS = ['None', 'Open', 'Active', 'Finished', 'Cancelled'] as const
export type PoolStatus = (typeof POOL_STATUS)[number]

export interface PoolData {
  id: bigint
  creator: Address
  buyIn: bigint
  totalWeeks: number
  currentWeek: number
  status: PoolStatus
  codeHash: `0x${string}`
  pot: bigint
  winnerCount: number
  winnerShare: bigint
  createdAt: number
}

export interface PlayerData {
  address: Address
  joined: boolean
  alive: boolean
  strikes: number
  usedTeams: number
  currentPick: number
  isWinner: boolean
  claimed: boolean
  refunded: boolean
}

export interface WeekData {
  week: number
  resolved: boolean
  winnersMask: number
  survivorsAfter: number
}

const common = { address: LMS_ADDRESS, abi: lastManStandingAbi, chainId: ARC_CHAIN_ID } as const

export function usePool(poolId: bigint | undefined) {
  const { address: me } = useAccount()
  const enabled = poolId !== undefined

  const base = useReadContracts({
    contracts: [
      { ...common, functionName: 'getPool', args: [poolId ?? 0n] },
      { ...common, functionName: 'getPlayers', args: [poolId ?? 0n] },
      { ...common, functionName: 'claimable', args: [poolId ?? 0n, me ?? '0x0000000000000000000000000000000000000000'] },
    ],
    query: { enabled, refetchInterval: 6000 },
  })

  const poolRes = base.data?.[0]
  const playersRes = base.data?.[1]
  const claimableRes = base.data?.[2]

  const pool: PoolData | undefined = useMemo(() => {
    if (poolId === undefined || poolRes?.status !== 'success') return undefined
    const p = poolRes.result
    return {
      id: poolId,
      creator: p.creator,
      buyIn: BigInt(p.buyIn),
      totalWeeks: Number(p.totalWeeks),
      currentWeek: Number(p.currentWeek),
      status: POOL_STATUS[Number(p.status)] ?? 'None',
      codeHash: p.codeHash,
      pot: p.pot,
      winnerCount: Number(p.winnerCount),
      winnerShare: p.winnerShare,
      createdAt: Number(p.createdAt),
    }
  }, [poolId, poolRes])

  const playerAddresses: readonly Address[] = useMemo(
    () => (playersRes?.status === 'success' ? playersRes.result : []),
    [playersRes],
  )

  const stateReads = useReadContracts({
    contracts: playerAddresses.map((p) => ({
      ...common,
      functionName: 'getPlayerState' as const,
      args: [poolId ?? 0n, p] as const,
    })),
    query: { enabled: enabled && playerAddresses.length > 0, refetchInterval: 6000 },
  })

  const weekCount = pool?.totalWeeks ?? 0
  const weekReads = useReadContracts({
    contracts: Array.from({ length: weekCount }, (_, i) => ({
      ...common,
      functionName: 'getWeekResult' as const,
      args: [poolId ?? 0n, i + 1] as const,
    })),
    query: { enabled: enabled && weekCount > 0, refetchInterval: 6000 },
  })

  const players: PlayerData[] = useMemo(() => {
    return playerAddresses.map((address, i) => {
      const r = stateReads.data?.[i]
      if (r?.status !== 'success') {
        return { address, joined: true, alive: false, strikes: 0, usedTeams: 0, currentPick: 0, isWinner: false, claimed: false, refunded: false }
      }
      const [joined, alive, strikes, usedTeams, currentPick, isWinner, claimed, refunded] = r.result
      return { address, joined, alive, strikes: Number(strikes), usedTeams: Number(usedTeams), currentPick: Number(currentPick), isWinner, claimed, refunded }
    })
  }, [playerAddresses, stateReads.data])

  const weeks: WeekData[] = useMemo(() => {
    const out: WeekData[] = []
    weekReads.data?.forEach((r, i) => {
      if (r.status === 'success') {
        const [resolved, winnersMask, survivorsAfter] = r.result
        out.push({ week: i + 1, resolved, winnersMask: Number(winnersMask), survivorsAfter: Number(survivorsAfter) })
      }
    })
    return out
  }, [weekReads.data])

  const meLower = me?.toLowerCase()
  const myPlayer = players.find((p) => p.address.toLowerCase() === meLower)

  return {
    pool,
    players,
    weeks,
    myPlayer,
    claimable: claimableRes?.status === 'success' ? claimableRes.result : 0n,
    isLoading: base.isLoading,
    notFound: enabled && !base.isLoading && poolRes?.status === 'failure',
    refetch: base.refetch,
  }
}
