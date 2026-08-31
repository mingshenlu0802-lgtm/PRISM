import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import SiteLayout from './components/site/SiteLayout'
import ConsoleLayout from './components/console/ConsoleLayout'

import HomePage from './pages/site/HomePage'
import NewsPage from './pages/site/NewsPage'
import RegionPage from './pages/site/RegionPage'
import TopicPage from './pages/site/TopicPage'
import StudiesPage from './pages/site/StudiesPage'
import AboutPage from './pages/site/AboutPage'

import SearchPage from './pages/console/SearchPage'
import ManagePage from './pages/console/ManagePage'

/** 换页时回到顶部——否则从长列表点进一条新闻会停在半空中。 */
function ScrollToTop(): null {
  const { pathname } = useLocation()
  useEffect(() => {
    const main = document.querySelector('[data-scroll-root]')
    if (main instanceof HTMLElement) main.scrollTo({ top: 0 })
    else window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

/**
 * 两块地方：公众站（谁都能看）和控制端（两页，站长和管理员用）。
 * 认不出来的地址一律回到首页，而不是给读者一个空白页。
 */
export default function App(): JSX.Element {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/news/:slug" element={<NewsPage />} />
          <Route path="/region/:key" element={<RegionPage />} />
          <Route path="/topic/:key" element={<TopicPage />} />
          <Route path="/studies" element={<StudiesPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>

        <Route path="/console" element={<ConsoleLayout />}>
          <Route index element={<SearchPage />} />
          <Route path="manage" element={<ManagePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
