import { Route, Routes } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import PracticeSetupPage from '../pages/PracticeSetupPage'
import PracticePage from '../pages/PracticePage'
import SessionSummaryPage from '../pages/SessionSummaryPage'
import StatisticsPage from '../pages/StatisticsPage'
import SettingsPage from '../pages/SettingsPage'
import NotFoundPage from '../pages/NotFoundPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/practice/setup" element={<PracticeSetupPage />} />
      <Route path="/practice/session" element={<PracticePage />} />
      <Route path="/practice/summary" element={<SessionSummaryPage />} />
      <Route path="/statistics" element={<StatisticsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
