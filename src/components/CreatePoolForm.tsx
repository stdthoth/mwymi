import { useState } from 'react'
import { erc20Abi, parseEventLogs, type Hex } from 'viem'
import { Minus, Plus } from 'lucide-react'
import { LMS_ADDRESS, USDC_ADDRESS } from '@/config/arc'
import { lastManStandingAbi } from '@/abi/lastManStanding'
import { generateInviteCode, hashInviteCode } from '@/lib/invite'
import { saveInviteCode } from '@/lib/inviteStore'
import { formatUsdc, parseUsdc } from '@/lib/format'
import { useTx } from '@/hooks/useTx'
import { useUsdc } from '@/hooks/useUsdc'
import { Card, SectionLabel, TxButton, TxStatus } from './ui'

const QUICK_AMOUNTS = ['1', '5', '10', '25']
const MIN_WEEKS = 2
const MAX_WEEKS = 18

export function CreatePoolForm({ onCreated }: { onCreated: (poolId: bigint) => void }) {
  const [amount, setAmount] = useState('5')
  const [weeks, setWeeks] = useState(8)
  const { balance, allowance } = useUsdc()
  const approveTx = useTx()
  const createTx = useTx()

  const buyIn = parseUsdc(amount)
  const validAmount = buyIn !== null && buyIn > 0n
  const insufficient = validAmount && balance !== undefined && buyIn > balance
  const needsApproval = validAmount && (allowance ?? 0n) < buyIn

  const approve = () => {
    if (!validAmount) return
    void approveTx.send({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [LMS_ADDRESS, buyIn] })
  }

  const create = async () => {
    if (!validAmount) return
    const code: Hex = generateInviteCode()
    const receipt = await createTx.send({
      address: LMS_ADDRESS,
      abi: lastManStandingAbi,
      functionName: 'createPool',
      args: [buyIn, weeks, hashInviteCode(code)],
    })
    if (!receipt) return
    const [event] = parseEventLogs({ abi: lastManStandingAbi, eventName: 'PoolCreated', logs: receipt.logs })
    if (event) {
      saveInviteCode(event.args.poolId, code)
      onCreated(event.args.poolId)
    }
  }

  return (
    <Card>
      <SectionLabel>Create a private pool</SectionLabel>

      <div className="glass-inner rounded-2xl p-4">
        <label htmlFor="buyin" className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>
          Buy-in per player
        </label>
        <div className="mt-1 flex items-baseline gap-2">
          <input
            id="buyin"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '')
              if (/^\d*\.?\d*$/.test(v)) setAmount(v)
            }}
            placeholder="0.00"
            className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-300"
            style={{ color: 'var(--ink)' }}
          />
          <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>
            USDC
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q)}
              className="btn-ghost min-h-[36px] rounded-full px-3.5 text-xs font-semibold"
            >
              {q} USDC
            </button>
          ))}
        </div>
      </div>

      <div className="glass-inner mt-3 flex items-center justify-between rounded-2xl p-4">
        <div>
          <div className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>
            Season length
          </div>
          <div className="display text-2xl font-bold tabular-nums">{weeks} weeks</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Fewer weeks"
            disabled={weeks <= MIN_WEEKS}
            onClick={() => setWeeks((w) => Math.max(MIN_WEEKS, w - 1))}
            className="btn-ghost flex size-11 items-center justify-center rounded-full"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="More weeks"
            disabled={weeks >= MAX_WEEKS}
            onClick={() => setWeeks((w) => Math.min(MAX_WEEKS, w + 1))}
            className="btn-ghost flex size-11 items-center justify-center rounded-full"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-pretty" style={{ color: 'var(--muted)' }}>
        You pay the buy-in now and join automatically. 2 to 32 players, one team per week, each team once. Two
        missed picks or one loss and you are out.
      </p>

      {insufficient && (
        <p className="mt-2 text-xs font-medium" style={{ color: 'var(--danger)' }}>
          Balance is {formatUsdc(balance)} USDC. Use Get test USDC in the sidebar.
        </p>
      )}

      <div className="mt-4">
        {needsApproval ? (
          <TxButton
            label={`Approve ${amount} USDC`}
            onClick={approve}
            state={approveTx.state}
            disabled={!validAmount || Boolean(insufficient)}
          />
        ) : (
          <TxButton
            label={`Create pool for ${validAmount ? amount : '0'} USDC`}
            onClick={() => void create()}
            state={createTx.state}
            disabled={!validAmount || Boolean(insufficient)}
          />
        )}
        <TxStatus state={needsApproval ? approveTx.state : createTx.state} />
      </div>
    </Card>
  )
}
