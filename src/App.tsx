import { useLocation } from 'react-router-dom'
import ErrorBoundary from './components/common/ErrorBoundary'
import { useEffect } from 'react'
import { storageService } from './services/storageService'
import StorageWarning from './components/common/StorageWarning'
import Header from './components/layout/Header'
import PageContainer from './components/layout/PageContainer'
import AppRoutes from './app/AppRoutes'
import './App.css'

function App() {
  const location = useLocation()
  useEffect(() => {
    storageService.initialize()
    storageService.loadSettings()
    storageService.loadMistakePatterns()
  }, [])
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <PageContainer>
        <StorageWarning />
        <ErrorBoundary key={location.key}>
          <AppRoutes />
        </ErrorBoundary>
      </PageContainer>
    </>
  )
}

export default App
