import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { usePracticeSession } from '../hooks/usePracticeSession'
import { isAttempt, isMistakePattern, storageService } from './storageService'
import ErrorBoundary from '../components/common/ErrorBoundary'
import { MemoryRouter } from 'react-router-dom'

it('requires selection, reveal, matching answer and a boolean assessment at the session boundary', () => {
  const { result } = renderHook(() =>
    usePracticeSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    }),
  )
  const question = result.current.question
  const answer = question.choices[0]
  act(() => {
    void result.current.recordResult(question.id, answer, true)
  })
  expect(result.current.session.attempted).toBe(0)
  act(() => {
    void result.current.updateCard(answer, false)
  })
  act(() => {
    void result.current.recordResult(question.id, answer, true)
  })
  expect(result.current.session.attempted).toBe(0)
  act(() => {
    void result.current.updateCard(answer, true)
  })
  act(() => {
    void result.current.recordResult(question.id, question.choices[1], true)
  })
  act(() => {
    void result.current.recordResult(
      question.id,
      answer,
      undefined as unknown as boolean,
    )
  })
  expect(storageService.loadAttempts()).toHaveLength(0)
  act(() => {
    void result.current.recordResult(question.id, answer, true)
  })
  expect(result.current.session.attempted).toBe(1)
})

it('rejects mathematically correct stored attempts and patterns outside their difficulty', () => {
  const fact = {
    id: 'a',
    questionId: 'q',
    sessionId: 's',
    operation: 'addition',
    difficulty: 1,
    firstOperand: 50,
    secondOperand: 50,
    correctAnswer: 100,
    selectedAnswer: 100,
    selfReportedCorrect: true,
    source: 'regular',
    attemptedAt: '2026-10-21T10:00:00Z',
    incorrectCount: 1,
    similarCorrectCount: 0,
    lastIncorrectAt: '2026-10-21T10:00:00Z',
    mastered: false,
  }
  expect(isAttempt(fact)).toBe(false)
  expect(isMistakePattern(fact)).toBe(false)
  expect(isAttempt({ ...fact, difficulty: 2 })).toBe(true)
  expect(isMistakePattern({ ...fact, difficulty: 2 })).toBe(true)
})

it('shows the friendly page boundary for a failure inside an asynchronous progress update', async () => {
  vi.stubGlobal('navigator', {
    locks: {
      request: (_name: string, update: () => void) =>
        Promise.resolve().then(update),
    },
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(storageService, 'saveAttempt').mockImplementation(() => {
    throw new Error('Internal storage failure')
  })
  function Session() {
    const state = usePracticeSession({
      operations: ['addition'],
      difficulty: 1,
      sessionLength: 5,
    })
    const question = state.question
    return (
      <button
        onClick={() => {
          void state.updateCard(question.choices[0], true)
          void state.recordResult(question.id, question.choices[0], true)
        }}
      >
        Record result
      </button>
    )
  }
  try {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Session />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Record result' }))
    expect(await screen.findByText(/We could not open this page/)).toBeVisible()
    expect(
      screen.queryByText('Internal storage failure'),
    ).not.toBeInTheDocument()
  } finally {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})
