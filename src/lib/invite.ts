import { encodeAbiParameters, keccak256, bytesToHex, isHex, type Hex } from 'viem'
import { buildShareLink } from './share'

/** Random bytes32 invite code, generated in the browser. */
export function generateInviteCode(): Hex {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

/** Matches the contract check: keccak256(abi.encode(bytes32 code)). */
export function hashInviteCode(code: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: 'bytes32' }], [code]))
}

/** The pool id goes in the query; the secret code stays in the #fragment (never sent to servers). */
export async function buildInviteLink(poolId: bigint, code: Hex): Promise<string> {
  return `${await buildShareLink(`/?pool=${poolId.toString()}`)}#${code}`
}

export interface ParsedInvite {
  poolId: bigint | null
  code: Hex | null
}

export function parseInviteFromLocation(): ParsedInvite {
  const params = new URLSearchParams(window.location.search)
  const rawPool = params.get('pool')
  let poolId: bigint | null = null
  if (rawPool && /^\d+$/.test(rawPool)) poolId = BigInt(rawPool)
  const frag = window.location.hash.replace(/^#/, '')
  const code = isHex(frag) && frag.length === 66 ? (frag as Hex) : null
  return { poolId, code }
}

/** Accepts a full invite link or a bare 0x code pasted by the user. */
export function parseInviteInput(input: string): ParsedInvite {
  const text = input.trim()
  try {
    const url = new URL(text)
    const rawPool = url.searchParams.get('pool')
    const frag = url.hash.replace(/^#/, '')
    return {
      poolId: rawPool && /^\d+$/.test(rawPool) ? BigInt(rawPool) : null,
      code: isHex(frag) && frag.length === 66 ? (frag as Hex) : null,
    }
  } catch {
    return { poolId: null, code: isHex(text) && text.length === 66 ? (text as Hex) : null }
  }
}
