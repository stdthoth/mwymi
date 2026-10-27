import { erc20Abi } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { ARC_CHAIN_ID, LMS_ADDRESS, USDC_ADDRESS } from '@/config/arc'

/** USDC ERC-20 view (6 decimals). On Arc this is the same pool as native gas, so it is shown once. */
export function useUsdc() {
  const { address } = useAccount()
  const enabled = Boolean(address)

  const balance = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled, refetchInterval: 8000 },
  })

  const allowance = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, LMS_ADDRESS] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled, refetchInterval: 8000 },
  })

  return {
    balance: balance.data,
    balanceLoading: balance.isLoading,
    allowance: allowance.data,
  }
}
