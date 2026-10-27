import { useCallback, useEffect, useState } from 'react'
import type { Hex } from 'viem'
import { parseInviteFromLocation } from '@/lib/invite'
import { Header } from '@/components/Header'
import { Home } from '@/components/Home'
import { PoolView } from '@/components/PoolView'

interface Route {
  poolId: bigint | null
  code: Hex | null
}

const readRoute = (): Route => parseInviteFromLocation()

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onPop = () => setRoute(readRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openPool = useCallback((id: bigint, code?: Hex) => {
    // The invite code stays in the #fragment: it is a bearer secret and is never sent to a server.
    history.pushState(null, '', `/?pool=${id.toString()}${code ? `#${code}` : ''}`)
    setRoute({ poolId: id, code: code ?? null })
  }, [])

  const goHome = useCallback(() => {
    history.pushState(null, '', '/')
    setRoute({ poolId: null, code: null })
  }, [])

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute"
          style={{ top: '8%', left: '5%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(133,177,237,0.22) 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div
          className="absolute"
          style={{ bottom: '8%', right: '8%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,205,131,0.20) 0%, transparent 70%)', filter: 'blur(58px)' }}
        />
      </div>
      <div className="relative z-10 mx-auto max-w-md px-4 pb-16 pt-6">
        <Header onHome={goHome} />
        <main>
          {route.poolId !== null ? (
            <PoolView key={route.poolId.toString()} poolId={route.poolId} inviteCode={route.code} onBack={goHome} />
          ) : (
            <Home onOpen={openPool} />
          )}
        </main>
      </div>
    </div>
  )
}
