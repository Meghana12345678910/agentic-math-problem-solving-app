import { renderReady as render } from '../test/renderReady'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import {
  storageService,
  createStorageService,
  isActiveSessionSnapshot,
} from '../services/storageService'
import type { PracticeConfiguration } from '../types/practiceConfiguration'

beforeEach(() => storageService.clearActiveSession())
const configuration: PracticeConfiguration = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
  mode: 'regular',
}
async function mount(
  entries: NonNullable<
    Parameters<typeof createMemoryRouter>[1]
  >['initialEntries'] = [
    { pathname: '/practice/session', state: { configuration } },
  ],
) {
  const router = createMemoryRouter([{ path: '*', element: <App /> }], {
    initialEntries: entries,
  })
  return { ...(await render(<RouterProvider router={router} />)), router }
}
async function reveal() {
  const user = userEvent.setup()
  const button = screen.getAllByRole('button', { name: /^Answer / })[0]
  const selected = Number(
    button.getAttribute('aria-label')!.replace('Answer ', ''),
  )
  await user.click(button)
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  return selected
}

describe('Phase 18 active-session recovery', () => {
  it('restores the exact question, selected answer, flipped side, session identity, and totals', async () => {
    const user = userEvent.setup()
    const view = await mount()
    await reveal()
    await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
    const selected = await reveal()
    const saved = createStorageService().loadActiveSession()!
    expect(saved.session.attempted).toBe(1)
    expect(saved.selectedAnswer).toBe(selected)
    expect(saved.isCardFlipped).toBe(true)
    expect(isActiveSessionSnapshot(saved)).toBe(true)
    view.unmount()
    await mount(['/practice/session'])
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(screen.getByText('Your answer: ' + selected)).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Answer revealed' }),
    ).toHaveFocus()
    expect(
      screen.getByText('Attempted: 1. Correct: 0. Incorrect: 1.'),
    ).toBeInTheDocument()
    expect(storageService.loadActiveSession()!.question.id).toBe(
      saved.question.id,
    )
    expect(storageService.loadActiveSession()!.session.id).toBe(
      saved.session.id,
    )
    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    expect(storageService.loadAttempts()).toHaveLength(2)
    expect(screen.getByText('Question 3 of 5')).toBeInTheDocument()
  })

  it('restores an unflipped selected answer when browser history state survives', async () => {
    const user = userEvent.setup()
    const view = await mount()
    const selected = screen.getAllByRole('button', { name: /^Answer / })[1]
    const label = selected.getAttribute('aria-label')!
    await user.click(selected)
    const saved = storageService.loadActiveSession()!
    view.unmount()
    await mount()
    expect(screen.getByRole('button', { name: label })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeEnabled()
    expect(storageService.loadActiveSession()!.session.id).toBe(
      saved.session.id,
    )
  })

  it('rejects invalid snapshots without crashing and preserves unrelated history', async () => {
    localStorage.setItem('mathPractice.activeSession', '{"session":"invalid"}')
    localStorage.setItem('unrelated', 'keep')
    await mount(['/practice/session'])
    expect(
      await screen.findByRole('heading', { name: 'Practice setup' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem('unrelated')).toBe('keep')
  })

  it('does not resume a snapshot under a different explicit configuration', async () => {
    const view = await mount()
    const original = storageService.loadActiveSession()!.session.id
    view.unmount()
    await mount([
      {
        pathname: '/practice/session',
        state: {
          configuration: { ...configuration, operations: ['division'] },
        },
      },
    ])
    expect(storageService.loadActiveSession()!.session.id).not.toBe(original)
    expect(screen.getByText('division', { selector: 'dd' })).toBeInTheDocument()
  })

  it('restores review lineage and does not count the same answer twice', async () => {
    storageService.saveMistakePatterns([
      {
        id: 'parent',
        operation: 'addition',
        firstOperand: 2,
        secondOperand: 3,
        correctAnswer: 5,
        difficulty: 1,
        incorrectCount: 1,
        similarCorrectCount: 0,
        mastered: false,
        lastIncorrectAt: new Date().toISOString(),
      },
    ])
    const user = userEvent.setup()
    const view = await mount([
      {
        pathname: '/practice/session',
        state: { configuration: { ...configuration, mode: 'mistake-review' } },
      },
    ])
    await reveal()
    const saved = storageService.loadActiveSession()!
    view.unmount()
    await mount(['/practice/session'])
    expect(storageService.loadActiveSession()!.question.mistakePatternId).toBe(
      'parent',
    )
    await user.dblClick(screen.getByRole('button', { name: 'I Got It Right' }))
    expect(storageService.loadAttempts()).toHaveLength(1)
    expect(storageService.loadMistakePatterns()[0].similarCorrectCount).toBe(1)
    expect(storageService.loadAttempts()[0].questionId).toBe(saved.question.id)
  })
})

describe('Phase 18 navigation safety', () => {
  it('blocks navigation, keeps the session on cancel, and ends before confirmed leaving', async () => {
    const user = userEvent.setup()
    const view = await mount()
    await reveal()
    const saved = storageService.loadActiveSession()!
    await user.click(screen.getByRole('link', { name: 'Statistics' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep practicing' }))
    expect(view.router.state.location.pathname).toBe('/practice/session')
    expect(
      await screen.findByRole('heading', { name: 'Answer revealed' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'End session and leave' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Statistics' }),
    ).toBeInTheDocument()
    expect(storageService.loadActiveSession()).toBeNull()
    expect(
      storageService
        .loadSessions()
        .find((session) => session.id === saved.session.id)?.completedAt,
    ).toBeTruthy()
  })

  it('blocks browser Back and allows cancellation and confirmed leaving', async () => {
    const user = userEvent.setup()
    const view = await mount([
      '/statistics',
      { pathname: '/practice/session', state: { configuration } },
    ])
    act(() => {
      void view.router.navigate(-1)
    })
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep practicing' }))
    expect(view.router.state.location.pathname).toBe('/practice/session')
    act(() => {
      void view.router.navigate(-1)
    })
    await user.click(
      await screen.findByRole('button', { name: 'End session and leave' }),
    )
    expect(view.router.state.location.pathname).toBe('/statistics')
  })

  it('warns on reload/close only while active and clears recovery on completion', async () => {
    const user = userEvent.setup()
    await mount([
      {
        pathname: '/practice/session',
        state: {
          configuration: { ...configuration, sessionLength: 'continuous' },
        },
      },
    ])
    const before = new Event('beforeunload', { cancelable: true })
    expect(window.dispatchEvent(before)).toBe(false)
    expect(before.defaultPrevented).toBe(true)
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(screen.getByRole('button', { name: 'Yes, end session' }))
    expect(
      await screen.findByRole('heading', { name: 'Session summary' }),
    ).toBeInTheDocument()
    expect(storageService.loadActiveSession()).toBeNull()
    expect(
      window.dispatchEvent(new Event('beforeunload', { cancelable: true })),
    ).toBe(true)
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('clears recovery along with application data', async () => {
    const view = await mount()
    expect(storageService.loadActiveSession()).not.toBeNull()
    view.unmount()
    storageService.clearAllData()
    expect(createStorageService().loadActiveSession()).toBeNull()
  })
})

it('resumes an operation set in reversed order using the saved configuration consistently', async () => {
  const mixed = { ...configuration, operations: ['addition', 'division'] }
  const view = await mount([
    { pathname: '/practice/session', state: { configuration: mixed } },
  ])
  const snapshot = storageService.loadActiveSession()!
  view.unmount()
  await mount([
    {
      pathname: '/practice/session',
      state: {
        configuration: { ...mixed, operations: ['division', 'addition'] },
      },
    },
  ])
  expect(
    await screen.findByRole('heading', { name: 'Practice session' }),
  ).toBeInTheDocument()
  const restored = storageService.loadActiveSession()!
  expect(restored.session.id).toBe(snapshot.session.id)
  expect(restored.question.id).toBe(snapshot.question.id)
  expect(restored.configuration.operations).toEqual(restored.session.operations)
  expect(isActiveSessionSnapshot(restored)).toBe(true)
})
