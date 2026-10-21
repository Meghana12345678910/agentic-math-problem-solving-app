import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestRouter as MemoryRouter } from '../test/TestRouter'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { usePracticeSession } from '../hooks/usePracticeSession'
import type { SessionSummary } from '../types/sessionSummary'

const summary: SessionSummary = {
  session: {
    id: 'finished',
    startedAt: '2026-10-21T10:00:00.000Z',
    completedAt: '2026-10-21T10:05:00.000Z',
    operations: ['multiplication', 'division'],
    difficulty: 3,
    sessionLength: 5,
    attempted: 5,
    correct: 3,
    incorrect: 2,
  },
  mistakeReviewCount: 2,
}
function renderSummary(value: unknown = summary) {
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/practice/summary', state: { summary: value } },
      ]}
    >
      <App />
    </MemoryRouter>,
  )
}
function valueFor(label: string) {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling
}

describe('Phase 8 summary', () => {
  it('shows totals, accuracy, configuration, review count, and completion time', () => {
    renderSummary()
    expect(valueFor('Questions attempted')).toHaveTextContent('5')
    expect(valueFor('Correct answers')).toHaveTextContent('3')
    expect(valueFor('Incorrect answers')).toHaveTextContent('2')
    expect(valueFor('Accuracy')).toHaveTextContent('60%')
    expect(valueFor('Operations practiced')).toHaveTextContent(
      'multiplication, division',
    )
    expect(valueFor('Difficulty level')).toHaveTextContent(
      'Level 3: Intermediate',
    )
    expect(valueFor('Mistake-review questions completed')).toHaveTextContent(
      '2',
    )
    expect(valueFor('Completed')?.querySelector('time')).toHaveAttribute(
      'datetime',
      summary.session.completedAt,
    )
    expect(
      screen.getByRole('heading', { name: 'Session summary' }),
    ).toHaveFocus()
    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toHaveAccessibleDescription(
      'No active mistakes match these practice choices.',
    )
  })

  it.each([
    [0, 0, 0],
    [5, 5, 100],
    [5, 0, 0],
    [3, 2, 67],
  ])(
    'calculates accuracy for %s attempts and %s correct',
    (attempted, correct, accuracy) => {
      renderSummary({
        session: {
          ...summary.session,
          sessionLength: 'continuous',
          attempted,
          correct,
          incorrect: attempted - correct,
        },
        mistakeReviewCount: 0,
      })
      expect(valueFor('Accuracy')).toHaveTextContent(accuracy + '%')
    },
  )

  it.each([null, {}, { session: {} }])(
    'handles missing summary %j',
    (value) => {
      renderSummary(value)
      expect(
        screen.getByText('No completed session is available yet.'),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Start Practice' }),
      ).toHaveAttribute('href', '/practice/setup')
    },
  )

  it('starts a fresh session using the previous configuration', async () => {
    const user = userEvent.setup()
    renderSummary()
    await user.click(screen.getByRole('link', { name: 'Practice Again' }))
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
    expect(
      screen.getByText('Attempted: 0. Correct: 0. Incorrect: 0.'),
    ).toBeInTheDocument()
    expect(screen.getByText('multiplication, division')).toBeInTheDocument()
    expect(screen.getByText('3', { selector: 'dd' })).toBeInTheDocument()
  })

  it.each([
    ['Change Settings', 'Practice setup'],
    ['View Statistics', 'Statistics'],
    ['Return Home', 'Welcome to Math Practice!'],
  ])('routes %s to its destination', async (action, heading) => {
    const user = userEvent.setup()
    renderSummary()
    await user.click(screen.getByRole('link', { name: action }))
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('sets a stable completion timestamp and stops recording at the fixed limit', () => {
    const { result } = renderHook(() =>
      usePracticeSession({
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
      }),
    )
    expect(result.current.session.completedAt).toBeUndefined()
    for (let i = 0; i < 5; i += 1) {
      const state = result.current
      act(() =>
        state.recordResult(state.question.id, state.question.choices[0], true),
      )
    }
    expect(result.current.active).toBe(false)
    expect(
      Number.isFinite(Date.parse(result.current.session.completedAt!)),
    ).toBe(true)
    const completed = result.current.session.completedAt
    const lastQuestion = result.current.question.id
    act(() => result.current.endSession())
    act(() =>
      result.current.recordResult(
        lastQuestion,
        result.current.question.choices[0],
        false,
      ),
    )
    expect(result.current.session.completedAt).toBe(completed)
    expect(result.current.question.id).toBe(lastQuestion)
    expect(result.current.session.attempted).toBe(5)
  })

  it('timestamps an ended continuous session with zero attempts', () => {
    const { result } = renderHook(() =>
      usePracticeSession({
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 'continuous',
      }),
    )
    act(() => result.current.endSession())
    expect(
      Number.isFinite(Date.parse(result.current.session.completedAt!)),
    ).toBe(true)
    expect(result.current.session.attempted).toBe(0)
  })
})
