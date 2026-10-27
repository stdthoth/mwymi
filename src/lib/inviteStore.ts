import { isHex, type Hex } from 'viem'

/**
 * The invite code is only hashed onchain, so the creator's browser keeps the code to rebuild
 * the invite link later. Only the code is stored, never a built link.
 */
const key = (poolId: bigint) => `mwymi:invite:${poolId.toString()}`

export function saveInviteCode(poolId: bigint, code: Hex) {
  try {
    localStorage.setItem(key(poolId), code)
  } catch {
    /* storage unavailable: the creator can still copy the link right after creation */
  }
}

export function loadInviteCode(poolId: bigint): Hex | null {
  try {
    const v = localStorage.getItem(key(poolId))
    return v && isHex(v) && v.length === 66 ? v : null
  } catch {
    return null
  }
}
