import { renderReady as render } from '../test/renderReady'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestRouter as MemoryRouter } from '../test/TestRouter'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { storageService } from '../services/storageService'
import type { MistakePattern } from '../types/mistake'

const pattern: MistakePattern = {
  id: 'p1',
  operation: 'addition',
  firstOperand: 2,
  secondOperand: 3,
  correctAnswer: 5,
  difficulty: 1,
  incorrectCount: 2,
  similarCorrectCount: 1,
  mastered: false,
  lastIncorrectAt: '2026-10-21T10:00:00Z',
}
function seed() {
  storageService.saveMistakePatterns([
    pattern,
    {
      ...pattern,
      id: 'p2',
      difficulty: 2,
      mastered: true,
      similarCorrectCount: 3,
      incorrectCount: 3,
    },
    {
      ...pattern,
      id: 'p3',
      operation: 'division',
      firstOperand: 10,
      secondOperand: 2,
      correctAnswer: 5,
      incorrectCount: 5,
    },
  ])
  localStorage.setItem(
    'mathPractice.attempts',
    JSON.stringify([
      {
        id: 'a1',
        questionId: 'q1',
        sessionId: 's1',
        operation: 'addition',
        firstOperand: 2,
        secondOperand: 3,
        correctAnswer: 5,
        selectedAnswer: 5,
        selfReportedCorrect: true,
        source: 'mistake-review',
        mistakePatternId: 'p1',
        difficulty: 1,
        attemptedAt: pattern.lastIncorrectAt,
      },
      {
        id: 'a2',
        questionId: 'q2',
        sessionId: 's1',
        operation: 'addition',
        firstOperand: 2,
        secondOperand: 3,
        correctAnswer: 5,
        selectedAnswer: 4,
        selfReportedCorrect: false,
        source: 'mistake-review',
        mistakePatternId: 'p1',
        difficulty: 1,
        attemptedAt: pattern.lastIncorrectAt,
      },
    ]),
  )
}
async function mount() {
  return await render(
    <MemoryRouter initialEntries={['/statistics']}>
      <App />
    </MemoryRouter>,
  )
}
function value(label: string) {
  return within(
    screen.getByRole('region', { name: 'Mistake review statistics' }),
  ).getByText(label, { selector: 'dt' }).nextElementSibling
}

describe('Phase 15 mistake statistics UI', () => {
  it('shows a friendly empty state and zero totals', async () => {
    await mount()
    expect(screen.getByText('No mistake patterns yet.')).toBeInTheDocument()
    expect(value('Active mistake patterns')).toHaveTextContent('0')
    expect(value('Mastered mistake patterns')).toHaveTextContent('0')
    expect(value('Similar questions practiced')).toHaveTextContent('0')
    expect(value('Review questions answered correctly')).toHaveTextContent('0')
  })
  it('shows counts, tied rankings, sorted active details, progress, and dates', async () => {
    seed()
    await mount()
    expect(value('Active mistake patterns')).toHaveTextContent('2')
    expect(value('Mastered mistake patterns')).toHaveTextContent('1')
    expect(value('Similar questions practiced')).toHaveTextContent('2')
    expect(value('Review questions answered correctly')).toHaveTextContent('1')
    expect(
      screen.getByText(/Addition, Division.*5 misses each.*tied/),
    ).toBeInTheDocument()
    expect(screen.getByText('2 + 3: 5 misses')).toBeInTheDocument()
    const headings = screen.getAllByRole('heading', { level: 4 })
    expect(headings[0]).toHaveTextContent('10 ÷ 2 = 5')
    expect(headings[1]).toHaveTextContent('2 + 3 = 5')
    expect(
      screen.getAllByRole('progressbar', { name: /Mastery/ }),
    ).toHaveLength(2)
    expect(
      screen.getAllByText('1 of 3 correct similar answers').length,
    ).toBeGreaterThan(0)
    expect(
      document.querySelector('time[datetime="2026-10-21T10:00:00Z"]'),
    ).not.toBeNull()
  })
  it('shows mastered patterns separately when expanded', async () => {
    const user = userEvent.setup()
    seed()
    await mount()
    const disclosure = screen.getByRole('button', {
      name: 'Mastered patterns (1)',
    })
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(2)
    await user.click(disclosure)
    expect(
      screen.getByRole('heading', { name: 'Mastered patterns (1)', level: 3 }),
    ).toBeVisible()
    expect(document.querySelector('summary')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(3)
    expect(
      screen.getByText('3 of 3 correct similar answers'),
    ).toBeInTheDocument()
    expect(screen.getByText('Mastered', { selector: 'dd' })).toBeInTheDocument()
  })
  it('refreshes review totals on reset while retaining mistake patterns', async () => {
    const user = userEvent.setup()
    seed()
    await mount()
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, reset statistics' }),
    )
    expect(value('Similar questions practiced')).toHaveTextContent('0')
    expect(value('Review questions answered correctly')).toHaveTextContent('0')
    expect(value('Active mistake patterns')).toHaveTextContent('2')
    expect(value('Mastered mistake patterns')).toHaveTextContent('1')
  })
  it('retains the same advanced statistics when reopened', async () => {
    seed()
    const view = await mount()
    view.unmount()
    await mount()
    expect(value('Active mistake patterns')).toHaveTextContent('2')
    expect(value('Similar questions practiced')).toHaveTextContent('2')
  })
})
