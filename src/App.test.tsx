import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Phase 2 interface', () => {
  it('shows the welcome message and three home actions', () => {
    renderApp()
    const main = within(screen.getByRole('main'))
    expect(
      main.getByRole('heading', {
        level: 1,
        name: 'Welcome to Math Practice!',
      }),
    ).toBeInTheDocument()
    for (const name of ['Start Practice', 'View Statistics', 'Settings']) {
      expect(main.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it.each([
    ['Start Practice', 'Practice setup'],
    ['View Statistics', 'Statistics'],
    ['Settings', 'Settings'],
  ])('navigates from %s to its page', async (action, heading) => {
    const user = userEvent.setup()
    renderApp()
    await user.click(
      within(screen.getByRole('main')).getByRole('link', { name: action }),
    )
    expect(
      screen.getByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
  })

  it.each([
    ['/', 'Welcome to Math Practice!'],
    ['/practice/setup', 'Practice setup'],
    ['/practice/session', 'Practice setup'],
    ['/practice/summary', 'Session summary'],
    ['/statistics', 'Statistics'],
    ['/settings', 'Settings'],
  ])('renders %s with shared navigation', (path, heading) => {
    renderApp(path)
    expect(
      screen.getByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeInTheDocument()
  })

  it('marks the current navigation link', async () => {
    const user = userEvent.setup()
    renderApp()
    const nav = within(screen.getByRole('navigation'))
    expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await user.click(nav.getByRole('link', { name: 'Statistics' }))
    expect(nav.getByRole('link', { name: 'Statistics' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('provides an unknown-route fallback and return home', async () => {
    const user = userEvent.setup()
    renderApp('/missing')
    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Return Home' }))
    expect(
      screen.getByRole('heading', { name: 'Welcome to Math Practice!' }),
    ).toBeInTheDocument()
  })

  it('supports keyboard navigation to the main practice action', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.tab()
    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveFocus()
    // Brand link and the four main navigation links precede the home actions.
    for (let index = 0; index < 6; index += 1) await user.tab()
    expect(screen.getByRole('link', { name: 'Start Practice' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(
      screen.getByRole('heading', { name: 'Practice setup' }),
    ).toBeInTheDocument()
  })
})
