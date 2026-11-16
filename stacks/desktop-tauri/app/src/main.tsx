import { Toaster } from '@app/ui'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { AppRoutes } from './app/routes'
import { inTauri, native } from './shared/lib/native'
import { token } from './shared/lib/token'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } })

// The token is read from the OS credential store before the first screen decides between sign-in and the app.
await token.restore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* HashRouter: the app is served from a custom protocol, so there is no server to answer deep links. */}
      <HashRouter>
        <AppRoutes />
      </HashRouter>
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)

// The window starts hidden (no white flash); show it once the first frame is painted.
if (inTauri()) requestAnimationFrame(() => requestAnimationFrame(() => void native.appReady().catch(() => undefined)))
