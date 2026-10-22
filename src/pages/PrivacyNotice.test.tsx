import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderReady } from '../test/renderReady'
import { TestRouter } from '../test/TestRouter'
import App from '../App'

describe('Phase 22 privacy notice', () => {
  it.each(['/', '/settings'])(
    'explains local progress and browser-data deletion on %s',
    async (path) => {
      await renderReady(
        <TestRouter initialEntries={[path]}>
          <App />
        </TestRouter>,
      )
      expect(
        screen.getByRole('heading', { name: 'Your practice stays here' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/saved in this browser on this device/),
      ).toBeInTheDocument()
      expect(screen.getByText(/Clearing your browser data/)).toHaveTextContent(
        'removes your saved progress and settings',
      )
      expect(
        document.querySelector(
          'input[type="email"], input[type="password"], iframe',
        ),
      ).toBeNull()
    },
  )
})
