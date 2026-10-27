import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { Toaster } from 'sonner'
import { config } from '@/config/wagmi'
import { installShareSync } from '@/lib/share'
import App from './App'
import './index.css'

installShareSync()

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          customTheme={{
            '--ck-font-family': "'DM Sans', sans-serif",
            '--ck-primary-button-background': '#122d45',
            '--ck-primary-button-color': '#ffffff',
            '--ck-body-background': '#ffffff',
            '--ck-body-color': '#122d45',
          }}
        >
          <App />
          <Toaster position="top-center" />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
