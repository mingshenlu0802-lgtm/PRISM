import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { PrismProvider } from './lib/store'
import { ErrorBoundary } from './components/common'
import './styles/tokens.css'
import './styles/base.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <PrismProvider>
          <App />
        </PrismProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
