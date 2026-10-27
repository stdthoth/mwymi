import { useCallback, useState } from 'react'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import type { Abi, Address, Hash, TransactionReceipt } from 'viem'
import { ARC_CHAIN_ID } from '@/config/arc'
import { parseOnchainError } from '@/lib/format'

export type TxPhase = 'idle' | 'wallet' | 'confirming' | 'success' | 'error'

export interface TxState {
  phase: TxPhase
  hash?: Hash
  error?: string
}

export interface TxRequest {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
}

/**
 * Sends one contract write: switches to Arc Testnet if needed, waits for the wallet,
 * waits for the receipt, then refreshes every onchain read. Returns the receipt on success, otherwise null.
 */
export function useTx() {
  const { chainId, isConnected } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID })
  const queryClient = useQueryClient()
  const [state, setState] = useState<TxState>({ phase: 'idle' })

  const send = useCallback(
    async (request: TxRequest): Promise<TransactionReceipt | null> => {
      if (!isConnected || !publicClient) return null
      try {
        if (chainId !== ARC_CHAIN_ID) await switchChainAsync({ chainId: ARC_CHAIN_ID })
        setState({ phase: 'wallet' })
        const hash = await writeContractAsync({
          ...request,
          chainId: ARC_CHAIN_ID,
        } as unknown as Parameters<typeof writeContractAsync>[0])
        setState({ phase: 'confirming', hash })
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') {
          setState({ phase: 'error', hash, error: 'Transaction failed onchain.' })
          return null
        }
        setState({ phase: 'success', hash })
        await queryClient.invalidateQueries()
        return receipt
      } catch (err) {
        const message = parseOnchainError(err)
        setState(message ? { phase: 'error', error: message } : { phase: 'idle' })
        return null
      }
    },
    [chainId, isConnected, publicClient, queryClient, switchChainAsync, writeContractAsync],
  )

  const reset = useCallback(() => setState({ phase: 'idle' }), [])

  return { state, send, reset, busy: state.phase === 'wallet' || state.phase === 'confirming' }
}
