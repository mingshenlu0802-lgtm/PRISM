import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import PublicLayout from './components/public/PublicLayout'
import CommandLayout from './components/command/CommandLayout'

import HomePage from './pages/public/HomePage'
import TopicPage from './pages/public/TopicPage'
import ArticlePage from './pages/public/ArticlePage'
import AboutPage from './pages/public/AboutPage'

import DashboardPage from './pages/command/DashboardPage'
import QueuePage from './pages/command/QueuePage'
import WorkbenchPage from './pages/command/WorkbenchPage'
import VersionsPage from './pages/command/VersionsPage'
import StudioPage from './pages/command/StudioPage'
import SignalsPage from './pages/command/SignalsPage'
import ResearchPage from './pages/command/ResearchPage'
import SourcesPage from './pages/command/SourcesPage'
import BriefPage from './pages/command/BriefPage'
import AuditPage from './pages/command/AuditPage'
import SettingsPage from './pages/command/SettingsPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    const main = document.querySelector('[data-scroll-root]')
    if (main instanceof HTMLElement) main.scrollTo({ top: 0 })
    else window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/topic/:topicKey" element={<TopicPage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>

        <Route path="/command" element={<CommandLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="article/:id" element={<WorkbenchPage />} />
          <Route path="article/:id/versions" element={<VersionsPage />} />
          <Route path="article/:id/studio" element={<StudioPage />} />
          <Route path="signals" element={<SignalsPage />} />
          <Route path="research" element={<ResearchPage />} />
          <Route path="sources" element={<SourcesPage />} />
          <Route path="brief" element={<BriefPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
