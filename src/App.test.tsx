import { renderReady as render } from './test/renderReady'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestRouter as MemoryRouter } from './test/TestRouter'
import { describe, expect, it } from 'vitest'
import App from './App'

async function renderApp(path = '/') {
  return await render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Phase 2 interface', () => {
  it('shows the welcome message and three home actions', async () => {
    await renderApp()
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
    await renderApp()
    await user.click(
      within(screen.getByRole('main')).getByRole('link', { name: action }),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
  })

  it.each([
    ['/', 'Welcome to Math Practice!'],
    ['/practice/setup', 'Practice setup'],
    ['/practice/session', 'Practice setup'],
    ['/practice/summary', 'Session summary'],
    ['/statistics', 'Statistics'],
    ['/settings', 'Settings'],
  ])('renders %s with shared navigation', async (path, heading) => {
    await renderApp(path)
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }),
    ).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Main navigation' }),
    ).toBeInTheDocument()
  })

  it('marks the current navigation link', async () => {
    const user = userEvent.setup()
    await renderApp()
    const nav = within(screen.getByRole('navigation'))
    expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await user.click(nav.getByRole('link', { name: 'Statistics' }))
    await screen.findByRole('heading', { name: 'Statistics', level: 1 })
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
    await renderApp('/missing')
    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Return Home' }))
    expect(
      await screen.findByRole('heading', { name: 'Welcome to Math Practice!' }),
    ).toBeInTheDocument()
  })

  it('supports keyboard navigation to the main practice action', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.tab()
    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveFocus()
    // Brand link and the four main navigation links precede the home actions.
    for (let index = 0; index < 6; index += 1) await user.tab()
    expect(screen.getByRole('link', { name: 'Start Practice' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', { name: 'Practice setup' }),
    ).toBeInTheDocument()
  })
})
