import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PrismProvider } from '../src/lib/store'
import CommandLayout from '../src/components/command/CommandLayout'
import WorkbenchPage from '../src/pages/command/WorkbenchPage'
import '../src/styles/tokens.css'
import '../src/styles/base.css'

const start = new URLSearchParams(window.location.search).get('a') ?? 'art-veyra'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={[`/command/article/${start}`]}>
      <PrismProvider>
        <Routes>
          <Route path="/command" element={<CommandLayout />}>
            <Route path="article/:id" element={<WorkbenchPage />} />
          </Route>
        </Routes>
      </PrismProvider>
    </MemoryRouter>
  </React.StrictMode>,
)
