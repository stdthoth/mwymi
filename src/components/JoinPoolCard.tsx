import { useState } from 'react'
import { erc20Abi, isHex, type Hex } from 'viem'
import { LMS_ADDRESS, USDC_ADDRESS } from '@/config/arc'
import { lastManStandingAbi } from '@/abi/lastManStanding'
import { hashInviteCode, parseInviteInput } from '@/lib/invite'
import { formatUsdc } from '@/lib/format'
import { useTx } from '@/hooks/useTx'
import { useUsdc } from '@/hooks/useUsdc'
import type { PoolData } from '@/hooks/usePool'
import { Card, SectionLabel, Stat, TxButton, TxStatus } from './ui'

interface Props {
  pool: PoolData
  playerCount: number
  initialCode: Hex | null
}

export function JoinPoolCard({ pool, playerCount, initialCode }: Props) {
  const [pasted, setPasted] = useState('')
  const { balance, allowance } = useUsdc()
  const approveTx = useTx()
  const joinTx = useTx()

  const fromPaste = parseInviteInput(pasted).code ?? (isHex(pasted.trim()) && pasted.trim().length === 66 ? (pasted.trim() as Hex) : null)
  const code = initialCode ?? fromPaste
  const codeValid = code !== null && hashInviteCode(code) === pool.codeHash
  const insufficient = balance !== undefined && balance < pool.buyIn
  const needsApproval = (allowance ?? 0n) < pool.buyIn

  const approve = () =>
    void approveTx.send({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [LMS_ADDRESS, pool.buyIn] })

  const join = () => {
    if (!code) return
    void joinTx.send({ address: LMS_ADDRESS, abi: lastManStandingAbi, functionName: 'joinPool', args: [pool.id, code] })
  }

  return (
    <Card>
      <SectionLabel>You are invited</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Buy-in" value={formatUsdc(pool.buyIn)} sub="USDC" />
        <Stat label="Season" value={pool.totalWeeks} sub="weeks" />
        <Stat label="Players" value={playerCount} sub="of 32 max" />
      </div>

      {!initialCode && (
        <div className="mt-3">
          <label htmlFor="invite-code" className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>
            Invite link or code
          </label>
          <input
            id="invite-code"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste your invite"
            className="glass-inner mt-1 min-h-[48px] w-full rounded-2xl px-4 text-sm outline-none"
          />
        </div>
      )}

      {code !== null && !codeValid && (
        <p role="alert" className="mt-3 text-xs font-medium" style={{ color: 'var(--danger)' }}>
          This invite code does not match the pool.
        </p>
      )}
      {insufficient && (
        <p className="mt-3 text-xs font-medium" style={{ color: 'var(--danger)' }}>
          You need {formatUsdc(pool.buyIn)} USDC. Use Get test USDC in the sidebar.
        </p>
      )}

      <div className="mt-4">
        {needsApproval ? (
          <TxButton
            label={`Approve ${formatUsdc(pool.buyIn)} USDC`}
            onClick={approve}
            state={approveTx.state}
            disabled={!codeValid || insufficient}
          />
        ) : (
          <TxButton
            label={`Join for ${formatUsdc(pool.buyIn)} USDC`}
            onClick={join}
            state={joinTx.state}
            disabled={!codeValid || insufficient}
          />
        )}
        <TxStatus state={needsApproval ? approveTx.state : joinTx.state} />
      </div>
    </Card>
  )
}
