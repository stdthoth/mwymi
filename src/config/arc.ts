import { defineChain, type Address } from 'viem'
import { arcTestnet } from 'viem/chains'

/** Public values come from .env (VITE_ keys); no addresses are inlined in source. */
const rpcUrl = import.meta.env.VITE_ARC_TESTNET_RPC_URL as string | undefined

export const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS as Address
export const LMS_ADDRESS = import.meta.env.VITE_LMS_ADDRESS as Address
export const USDC_DECIMALS = 6

export const arc = defineChain({
  ...arcTestnet,
  rpcUrls: {
    default: { http: rpcUrl ? [rpcUrl] : [...arcTestnet.rpcUrls.default.http] },
  },
})

export const ARC_CHAIN_ID = arc.id
export const EXPLORER_URL = arc.blockExplorers.default.url

export const txUrl = (hash: string) => `${EXPLORER_URL}/tx/${hash}`
export const addressUrl = (address: string) => `${EXPLORER_URL}/address/${address}`
