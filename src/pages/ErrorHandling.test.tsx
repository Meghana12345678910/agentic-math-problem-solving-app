import { renderReady as render } from '../test/renderReady'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLocation } from 'react-router-dom'
import App from '../App'
import ErrorBoundary from '../components/common/ErrorBoundary'
import { TestRouter } from '../test/TestRouter'
import { storageService } from '../services/storageService'

function BrokenPage(): never {
  throw new Error('SECRET technical stack detail')
}
function BoundaryRoutes() {
  const location = useLocation()
  return (
    <ErrorBoundary key={location.key}>
      {location.pathname === '/' ? <h1>Safe home</h1> : <BrokenPage />}
    </ErrorBoundary>
  )
}

describe('Phase 19 friendly errors', () => {
  it('explains a missing session and offers home without losing setup controls', async () => {
    storageService.clearActiveSession()
    await render(
      <TestRouter initialEntries={['/practice/session']}>
        <App />
      </TestRouter>,
    )
    expect(
      await screen.findByText(/could not find a practice session/),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Practice setup' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Return Home' }))
    expect(
      await screen.findByRole('heading', { name: /Math Practice/ }),
    ).toBeInTheDocument()
  })
  it('catches unexpected rendering errors and recovers on navigation without exposing details', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await render(
      <TestRouter initialEntries={['/broken']}>
        <BoundaryRoutes />
      </TestRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not open this page',
    )
    expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Return Home' }))
    expect(
      await screen.findByRole('heading', { name: 'Safe home' }),
    ).toBeInTheDocument()
    log.mockRestore()
  })
})
