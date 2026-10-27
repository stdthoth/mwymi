import { useState } from 'react'
import type { Hex } from 'viem'
import { parseInviteInput } from '@/lib/invite'
import { Card, SectionLabel } from './ui'

export function JoinByInvite({ onOpen }: { onOpen: (id: bigint, code: Hex) => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const { poolId, code } = parseInviteInput(value)
    if (poolId === null || !code) {
      setError('Paste the full invite link you were sent.')
      return
    }
    setError(null)
    onOpen(poolId, code)
  }

  return (
    <Card>
      <SectionLabel>Join with an invite</SectionLabel>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste invite link"
          aria-label="Invite link"
          className="glass-inner min-h-[48px] w-full rounded-2xl px-4 text-sm outline-none"
          style={{ color: 'var(--ink)' }}
        />
        <button type="button" onClick={submit} disabled={!value.trim()} className="btn-primary min-h-[48px] rounded-2xl px-5 text-sm font-semibold">
          Open
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </Card>
  )
}
