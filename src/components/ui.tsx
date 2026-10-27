import type { ReactNode } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { Check, ExternalLink, Loader2 } from 'lucide-react'
import { txUrl } from '@/config/arc'
import type { TxState } from '@/hooks/useTx'
import type { PoolStatus } from '@/hooks/usePool'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`glass-card rounded-3xl p-5 ${className}`}>{children}</section>
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--subtle)' }}>
      {children}
    </h2>
  )
}

const STATUS_STYLE: Record<PoolStatus, { label: string; bg: string; fg: string }> = {
  None: { label: 'Unknown', bg: 'rgba(18,45,69,0.08)', fg: 'var(--muted)' },
  Open: { label: 'Open to join', bg: 'rgba(16,97,166,0.10)', fg: 'var(--accent-hover)' },
  Active: { label: 'In season', bg: 'rgba(26,128,71,0.12)', fg: 'var(--success)' },
  Finished: { label: 'Finished', bg: 'rgba(18,45,69,0.08)', fg: 'var(--ink-2)' },
  Cancelled: { label: 'Cancelled', bg: 'rgba(186,43,76,0.10)', fg: 'var(--danger)' },
}

export function StatusBadge({ status }: { status: PoolStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  )
}

interface TxButtonProps {
  label: string
  onClick: () => void
  state?: TxState
  disabled?: boolean
  variant?: 'primary' | 'ghost'
  className?: string
}

/** One CTA: connect, then idle, wallet signature, confirming. Driven by real transaction state. */
export function TxButton({ label, onClick, state, disabled, variant = 'primary', className = '' }: TxButtonProps) {
  const { isConnected } = useAccount()
  const base = `flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
    variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  } ${className}`

  if (!isConnected) {
    return (
      <ConnectKitButton.Custom>
        {({ show }) => (
          <button type="button" onClick={show} className={base}>
            Connect wallet
          </button>
        )}
      </ConnectKitButton.Custom>
    )
  }

  const phase = state?.phase
  const waiting = phase === 'wallet' || phase === 'confirming'
  return (
    <button type="button" onClick={onClick} disabled={disabled || waiting} className={base}>
      {phase === 'wallet' ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Confirm in wallet...
        </>
      ) : phase === 'confirming' ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Confirming...
        </>
      ) : (
        label
      )}
    </button>
  )
}

export function TxStatus({ state }: { state: TxState }) {
  if (state.phase === 'error' && state.error) {
    return (
      <p role="alert" className="mt-3 text-xs font-medium" style={{ color: 'var(--danger)' }}>
        {state.error}
      </p>
    )
  }
  if (state.phase === 'success' && state.hash) {
    return (
      <a
        href={txUrl(state.hash)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: 'var(--success)' }}
      >
        <Check className="size-3.5" /> Confirmed
        <span className="inline-flex items-center gap-1 font-medium" style={{ color: 'var(--accent-hover)' }}>
          View on explorer <ExternalLink className="size-3" />
        </span>
      </a>
    )
  }
  return null
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="glass-inner rounded-2xl p-3">
      <div className="text-[11px] font-medium" style={{ color: 'var(--subtle)' }}>
        {label}
      </div>
      <div className="display mt-0.5 text-lg font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
