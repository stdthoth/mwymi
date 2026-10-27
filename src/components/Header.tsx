import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { TokenUSDC } from '@web3icons/react'
import { formatUsdc } from '@/lib/format'
import { useUsdc } from '@/hooks/useUsdc'

export function Header({ onHome }: { onHome: () => void }) {
  const { isConnected } = useAccount()
  const { balance } = useUsdc()

  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <button type="button" onClick={onHome} className="flex min-h-[44px] items-center gap-2">
        <span
          className="display flex size-9 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: 'var(--accent)' }}
        >
          M
        </span>
        <span className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>
          MWYMI
        </span>
      </button>
      <div className="flex items-center gap-2">
        {isConnected && balance !== undefined && (
          <span
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold tabular-nums sm:flex"
            style={{ background: 'rgba(255,255,255,0.58)', border: '1px solid var(--border)' }}
          >
            <TokenUSDC variant="branded" size={16} /> {formatUsdc(balance)}
          </span>
        )}
        <ConnectKitButton />
      </div>
    </header>
  )
}
