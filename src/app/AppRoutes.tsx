import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import CardPreviewPage from '../pages/CardPreviewPage'
import HomePage from '../pages/HomePage'
import PracticeSetupPage from '../pages/PracticeSetupPage'
import PracticePage from '../pages/PracticePage'
import SessionSummaryPage from '../pages/SessionSummaryPage'
import NotFoundPage from '../pages/NotFoundPage'

const StatisticsPage = lazy(() => import('../pages/StatisticsPage'))
const SettingsPage = lazy(() => import('../pages/SettingsPage'))

function AppRoutes() {
  return (
    <Suspense
      fallback={
        <section aria-label="Loading page">
          <h1 tabIndex={-1}>Loading page</h1>
          <p role="status">Please wait while this page opens.</p>
        </section>
      }
    >
      <Routes>
        <Route path="/practice/card-preview" element={<CardPreviewPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/practice/setup" element={<PracticeSetupPage />} />
        <Route path="/practice/session" element={<PracticePage />} />
        <Route path="/practice/summary" element={<SessionSummaryPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
