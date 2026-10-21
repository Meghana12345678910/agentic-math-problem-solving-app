import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { usePracticeSession, nextQuestion } from '../hooks/usePracticeSession'
import { generateQuestion } from '../services/questionGenerator'
import { isPracticeConfiguration } from '../utils/practiceConfiguration'
import type { PracticeConfiguration } from '../types/practiceConfiguration'

const config: PracticeConfiguration = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
}
function renderSession(configuration: unknown = config) {
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/practice/session', state: { configuration } },
      ]}
    >
      <App />
    </MemoryRouter>,
  )
}
async function answer(correct = true) {
  const user = userEvent.setup()
  await user.click(screen.getAllByRole('button', { name: /^Answer / })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: correct ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

describe('Phase 7 practice sessions', () => {
  it.each([
    null,
    {},
    { ...config, operations: [] },
    { ...config, difficulty: 0 },
    { ...config, sessionLength: 7 },
    { ...config, operations: ['bogus'] },
  ])('redirects invalid setup %j', (value) => {
    renderSession(value)
    expect(
      screen.getByRole('heading', { name: 'Practice setup' }),
    ).toBeInTheDocument()
  })

  it('shows a first card and advances only after a self-reported result', async () => {
    const user = userEvent.setup()
    renderSession()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    const before = screen.getByRole('heading', { level: 3 }).textContent
    await user.click(screen.getAllByRole('button', { name: /^Answer / })[0])
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    expect(
      screen.getByText('Attempted: 0. Correct: 0. Incorrect: 0.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3 }).textContent).not.toBe(
      before,
    )
    expect(
      screen.getByText('Attempted: 1. Correct: 0. Incorrect: 1.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1')
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
    expect(
      screen
        .getAllByRole('button', { name: /^Answer / })
        .every((button) => button.getAttribute('aria-pressed') === 'false'),
    ).toBe(true)
  })

  it('stops a fixed session and navigates to its summary', async () => {
    renderSession()
    for (let index = 0; index < 5; index += 1) await answer(index % 2 === 0)
    expect(
      screen.getByRole('heading', { name: 'Session summary' }),
    ).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Flip Card' }),
    ).not.toBeInTheDocument()
  })

  it('continues beyond fixed lengths, confirms ending, and shows the summary page', async () => {
    const user = userEvent.setup()
    renderSession({ ...config, sessionLength: 'continuous' })
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    for (let index = 0; index < 2; index += 1) await answer()
    expect(
      screen.getByText('Question 3 · Continuous practice'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(screen.getByRole('button', { name: 'Keep practicing' }))
    expect(
      screen.getByRole('button', { name: 'Flip Card' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(screen.getByRole('button', { name: 'Yes, end session' }))
    expect(
      screen.getByRole('heading', { name: 'Session summary' }),
    ).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Flip Card' }),
    ).not.toBeInTheDocument()
  })

  it('stores full attempts once and trusts the self-report over answer comparison', () => {
    const { result } = renderHook(() => usePracticeSession(config))
    const initial = result.current
    const selected = initial.question.choices.find(
      (choice) => choice !== initial.question.correctAnswer,
    )!
    act(() => {
      initial.recordResult(initial.question.id, selected, true)
      initial.recordResult(initial.question.id, selected, false)
    })
    expect(result.current.session.correct).toBe(1)
    expect(result.current.session.attempted).toBe(1)
    expect(result.current.attempts).toHaveLength(1)
    expect(result.current.attempts[0]).toMatchObject({
      questionId: initial.question.id,
      sessionId: initial.session.id,
      selectedAnswer: selected,
      selfReportedCorrect: true,
      firstOperand: initial.question.firstOperand,
      secondOperand: initial.question.secondOperand,
      correctAnswer: initial.question.correctAnswer,
      operation: 'addition',
      difficulty: 1,
      source: 'regular',
    })
    expect(
      Number.isNaN(Date.parse(result.current.attempts[0].attemptedAt)),
    ).toBe(false)
    const current = result.current
    act(() => current.recordResult(current.question.id, -999, true))
    expect(result.current.attempts).toHaveLength(1)
    act(() => result.current.endSession())
    act(() =>
      result.current.recordResult(
        result.current.question.id,
        result.current.question.choices[0],
        true,
      ),
    )
    expect(result.current.attempts).toHaveLength(1)
  })

  it('retains selected configuration for every generated question', () => {
    const mixed: PracticeConfiguration = {
      operations: ['multiplication', 'division'],
      difficulty: 3,
      sessionLength: 'continuous',
    }
    const { result } = renderHook(() => usePracticeSession(mixed))
    expect(result.current.session).toMatchObject(mixed)
    for (let index = 0; index < 25; index += 1) {
      const current = result.current
      expect(mixed.operations).toContain(current.question.operation)
      expect(current.question.difficulty).toBe(3)
      act(() =>
        current.recordResult(
          current.question.id,
          current.question.choices[0],
          true,
        ),
      )
    }
    expect(result.current.active).toBe(true)
    expect(result.current.questionIndex).toBe(25)
  })

  it('avoids repeats even with a constant random source', () => {
    const previous = generateQuestion('addition', 1, () => 0)
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const next = nextQuestion(config, previous)
      expect([
        next.operation,
        next.firstOperand,
        next.secondOperand,
      ]).not.toEqual([
        previous.operation,
        previous.firstOperand,
        previous.secondOperand,
      ])
    } finally {
      random.mockRestore()
    }
  })

  it('rejects malformed and duplicate configuration values', () => {
    for (const value of [
      undefined,
      'bad',
      123,
      { ...config, operations: ['addition', 'addition'] },
      { ...config, operations: null },
    ]) {
      expect(isPracticeConfiguration(value)).toBe(false)
    }
  })
})
