import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { PrismProvider } from './lib/store'
import { ErrorBoundary } from './components/common'
import { takeAuthFromHash } from './lib/authlink'
import './styles/tokens.css'
import './styles/base.css'

/*
 * 必须在这一行之前。
 *
 * 登录邮件把令牌放在 hash 里带回来，而 HashRouter 一起来就会把认不出的 hash
 * 换成 `#/`——令牌还没被读到就没了。所以先抄走，再让路由启动。
 */
takeAuthFromHash()

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
