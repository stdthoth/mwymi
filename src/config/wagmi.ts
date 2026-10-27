import { createConfig, http } from 'wagmi'
import { injected, coinbaseWallet } from 'wagmi/connectors'
import { arc } from './arc'

export const config = createConfig({
  chains: [arc],
  connectors: [injected(), coinbaseWallet({ appName: 'MWYMI' })],
  transports: { [arc.id]: http(arc.rpcUrls.default.http[0]) },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
