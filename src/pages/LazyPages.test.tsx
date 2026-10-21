import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TestRouter } from '../test/TestRouter'
import App from '../App'

const gates = vi.hoisted(() => {
  function gate() {
    let resolve!: () => void
    const promise = new Promise<void>((done) => {
      resolve = done
    })
    return { promise, resolve }
  }
  return { statistics: gate(), settings: gate() }
})
vi.mock('./StatisticsPage', async (original) => {
  await gates.statistics.promise
  return original()
})
vi.mock('./SettingsPage', async (original) => {
  await gates.settings.promise
  return original()
})

describe('Phase 21 deferred page loading', () => {
  it.each([
    ['statistics', 'Statistics'],
    ['settings', 'Settings'],
  ] as const)(
    'keeps navigation and a loading announcement while %s loads, then focuses the page',
    async (path, heading) => {
      render(
        <TestRouter initialEntries={['/' + path]}>
          <App />
        </TestRouter>,
      )
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'Loading page' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent('Please wait')
      await act(async () => {
        gates[path].resolve()
        await gates[path].promise
      })
      expect(
        await screen.findByRole('heading', { name: heading, level: 1 }),
      ).toHaveFocus()
      expect(
        screen.queryByRole('heading', { name: 'Loading page' }),
      ).not.toBeInTheDocument()
    },
    15000,
  )
})
