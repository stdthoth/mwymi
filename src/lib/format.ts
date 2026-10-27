import { formatUnits, parseUnits } from 'viem'
import { USDC_DECIMALS } from '@/config/arc'

/** USDC ERC-20 view (6 decimals) rendered with 2-6 fraction digits, trailing zeros trimmed past cents. */
export function formatUsdc(raw: bigint | undefined): string {
  if (raw === undefined) return '0.00'
  const [whole, frac = ''] = formatUnits(raw, USDC_DECIMALS).split('.')
  const trimmed = frac.replace(/0+$/, '')
  const shown = trimmed.length < 2 ? trimmed.padEnd(2, '0') : trimmed
  return `${Number(whole).toLocaleString('en-US')}.${shown}`
}

export function parseUsdc(value: string): bigint | null {
  if (!/^\d*\.?\d*$/.test(value) || value === '' || value === '.') return null
  const [, frac = ''] = value.split('.')
  if (frac.length > USDC_DECIMALS) return null
  try {
    return parseUnits(value, USDC_DECIMALS)
  } catch {
    return null
  }
}

export const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

export function parseOnchainError(error: unknown): string | null {
  const e = error as { message?: string; shortMessage?: string; code?: number } | undefined
  const message = `${e?.shortMessage ?? ''} ${e?.message ?? ''}`.toLowerCase()
  if (!message.trim()) return 'Something went wrong. Please try again.'
  if (message.includes('user rejected') || message.includes('user denied') || e?.code === 4001) return null
  if (message.includes('invalidcode')) return 'That invite code is not valid for this pool.'
  if (message.includes('alreadyjoined')) return 'You have already joined this pool.'
  if (message.includes('poolfull')) return 'This pool is full.'
  if (message.includes('teamalreadyused')) return 'You already used that team.'
  if (message.includes('notenoughplayers')) return 'At least 2 players are needed to start.'
  if (message.includes('notcreator')) return 'Only the creator can do that yet.'
  if (message.includes('insufficient funds') || message.includes('exceeds balance') || message.includes('insufficient allowance')) {
    return 'Insufficient USDC balance. Use Get test USDC in the sidebar.'
  }
  if (message.includes('reverted')) return 'Transaction failed. Please check the pool state and try again.'
  if (message.includes('network') || message.includes('timeout')) return 'Network issue. Please try again.'
  return 'Something went wrong. Please try again.'
}
