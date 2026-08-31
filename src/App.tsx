import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import SiteLayout from './components/site/SiteLayout'

import HomePage from './pages/site/HomePage'
import NewsPage from './pages/site/NewsPage'
import RegionPage from './pages/site/RegionPage'
import TopicPage from './pages/site/TopicPage'
import StudiesPage from './pages/site/StudiesPage'
import AboutPage from './pages/site/AboutPage'

// 控制端单独打包：读者不该为一个只有站长会打开的界面下载 Claude SDK。
const ConsoleLayout = lazy(() => import('./components/console/ConsoleLayout'))
const SearchPage = lazy(() => import('./pages/console/SearchPage'))
const ManagePage = lazy(() => import('./pages/console/ManagePage'))

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

/** 控制端那一小块代码还在路上时占个位，别让屏幕空着。 */
function Loading(): JSX.Element {
  return <p style={{ padding: 40, textAlign: 'center', color: 'var(--fg-faint)' }}>正在打开控制端…</p>
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

        <Route path="/console" element={<Suspense fallback={<Loading />}><ConsoleLayout /></Suspense>}>
          <Route index element={<Suspense fallback={<Loading />}><SearchPage /></Suspense>} />
          <Route path="manage" element={<Suspense fallback={<Loading />}><ManagePage /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
