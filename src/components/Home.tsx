import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { ShieldCheck, Trophy, Users } from 'lucide-react'
import type { Hex } from 'viem'
import { Card } from './ui'
import { CreatePoolForm } from './CreatePoolForm'
import { JoinByInvite } from './JoinByInvite'
import { PoolList } from './PoolList'

interface Props {
  onOpen: (id: bigint, code?: Hex) => void
}

const POINTS = [
  { icon: Users, text: 'Invite your group with a private link' },
  { icon: ShieldCheck, text: 'Buy-ins sit in escrow, paid out by the rules' },
  { icon: Trophy, text: 'Last players standing split the pot' },
]

export function Home({ onOpen }: Props) {
  const { isConnected } = useAccount()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-3">
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--subtle)' }}>
          Mode 1
        </p>
        <h1 className="display mt-1 text-4xl font-bold text-balance">Last Man Standing</h1>
        <p className="mt-2 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
          Pick one NFL team to win each week. Lose and you are out. You can never pick the same team twice. Outlast
          everyone and take the pot.
        </p>
        <ul className="mt-4 space-y-2">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--ink-2)' }}>
              <span className="flex size-8 items-center justify-center rounded-xl" style={{ background: 'rgba(18,45,69,0.07)' }}>
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
        {!isConnected && (
          <div className="mt-5">
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button type="button" onClick={show} className="btn-primary min-h-[48px] w-full rounded-2xl text-sm font-semibold">
                  Connect wallet to play
                </button>
              )}
            </ConnectKitButton.Custom>
            <p className="mt-2 text-center text-xs" style={{ color: 'var(--subtle)' }}>
              Runs on Arc Testnet with test USDC.
            </p>
          </div>
        )}
      </Card>

      {isConnected && (
        <>
          {showCreate ? (
            <CreatePoolForm onCreated={(id) => onOpen(id)} />
          ) : (
            <button type="button" onClick={() => setShowCreate(true)} className="btn-primary min-h-[52px] w-full rounded-2xl text-sm font-semibold">
              Create a private pool
            </button>
          )}
          <JoinByInvite onOpen={(id, code) => onOpen(id, code)} />
          <PoolList onOpen={(id) => onOpen(id)} />
        </>
      )}
    </div>
  )
}
