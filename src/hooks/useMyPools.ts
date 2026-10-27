import { useMemo } from 'react'
import { useAccount, useReadContracts } from 'wagmi'
import { ARC_CHAIN_ID, LMS_ADDRESS } from '@/config/arc'
import { lastManStandingAbi } from '@/abi/lastManStanding'
import { POOL_STATUS, type PoolStatus } from './usePool'

export interface PoolSummary {
  id: bigint
  buyIn: bigint
  pot: bigint
  totalWeeks: number
  currentWeek: number
  status: PoolStatus
}

const common = { address: LMS_ADDRESS, abi: lastManStandingAbi, chainId: ARC_CHAIN_ID } as const

export function useMyPools() {
  const { address } = useAccount()

  const ids = useReadContracts({
    contracts: [{ ...common, functionName: 'getPoolsOf', args: [address ?? '0x0000000000000000000000000000000000000000'] }],
    query: { enabled: Boolean(address), refetchInterval: 8000 },
  })

  const poolIds = useMemo(() => {
    const r = ids.data?.[0]
    return r?.status === 'success' ? [...r.result].reverse() : []
  }, [ids.data])

  const pools = useReadContracts({
    contracts: poolIds.map((id) => ({ ...common, functionName: 'getPool' as const, args: [id] as const })),
    query: { enabled: poolIds.length > 0, refetchInterval: 8000 },
  })

  const list: PoolSummary[] = useMemo(() => {
    const out: PoolSummary[] = []
    pools.data?.forEach((r, i) => {
      if (r.status === 'success') {
        out.push({
          id: poolIds[i],
          buyIn: BigInt(r.result.buyIn),
          pot: r.result.pot,
          totalWeeks: Number(r.result.totalWeeks),
          currentWeek: Number(r.result.currentWeek),
          status: POOL_STATUS[Number(r.result.status)] ?? 'None',
        })
      }
    })
    return out
  }, [pools.data, poolIds])

  return { pools: list, isLoading: ids.isLoading || pools.isLoading }
}
