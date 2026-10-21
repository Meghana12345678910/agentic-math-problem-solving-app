import { renderReady as render } from '../test/renderReady'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestRouter as MemoryRouter } from '../test/TestRouter'
import { describe, expect, it } from 'vitest'
import App from '../App'
import {
  storageService,
  defaultSettings,
  createStorageService,
} from '../services/storageService'
import type { PracticeAttempt, PracticeSession } from '../types/session'

const attempt: PracticeAttempt = {
  id: 'a1',
  questionId: 'q1',
  sessionId: 's1',
  operation: 'addition',
  difficulty: 1,
  firstOperand: 2,
  secondOperand: 3,
  correctAnswer: 5,
  selectedAnswer: 4,
  selfReportedCorrect: true,
  source: 'regular',
  attemptedAt: '2026-10-21T10:01:00Z',
}
const session: PracticeSession = {
  id: 's1',
  startedAt: '2026-10-21T10:00:00Z',
  completedAt: '2026-10-21T10:02:00Z',
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
  attempted: 2,
  correct: 1,
  incorrect: 1,
}
function seed() {
  storageService.saveAttempt(attempt)
  storageService.saveAttempt({
    ...attempt,
    id: 'a2',
    questionId: 'q2',
    operation: 'division',
    firstOperand: 10,
    secondOperand: 2,
    difficulty: 2,
    selfReportedCorrect: false,
  })
  storageService.saveSession(session)
  storageService.saveSession({
    ...session,
    id: 's2',
    operations: ['division'],
    difficulty: 2,
    startedAt: '2026-10-21T11:00:00Z',
    completedAt: '2026-10-21T11:02:00Z',
  })
}
async function mount() {
  return await render(
    <MemoryRouter initialEntries={['/statistics']}>
      <App />
    </MemoryRouter>,
  )
}
function total(region: string, label: string) {
  return within(screen.getByRole('region', { name: region })).getByText(label, {
    selector: 'dt',
  }).nextElementSibling
}

describe('Phase 10 statistics page', () => {
  it('renders empty states and all operation and difficulty cards', async () => {
    await mount()
    expect(screen.getByText(/No questions answered yet/)).toBeInTheDocument()
    expect(screen.getByText('No practice sessions yet.')).toBeInTheDocument()
    for (const title of [
      'Overall totals',
      'Addition',
      'Subtraction',
      'Multiplication',
      'Division',
      'Level 1: Beginner',
      'Level 2: Easy',
      'Level 3: Intermediate',
      'Level 4: Advanced',
    ]) {
      expect(total(title, 'Attempted')).toHaveTextContent('0')
      expect(total(title, 'Accuracy')).toHaveTextContent('0%')
    }
  })
  it('loads saved totals, breakdowns, and recent sessions newest first', async () => {
    seed()
    await mount()
    expect(total('Overall totals', 'Attempted')).toHaveTextContent('2')
    expect(total('Overall totals', 'Correct')).toHaveTextContent('1')
    expect(total('Overall totals', 'Incorrect')).toHaveTextContent('1')
    expect(total('Overall totals', 'Accuracy')).toHaveTextContent('50%')
    expect(total('Addition', 'Accuracy')).toHaveTextContent('100%')
    expect(total('Division', 'Accuracy')).toHaveTextContent('0%')
    expect(total('Level 1: Beginner', 'Correct')).toHaveTextContent('1')
    expect(total('Level 2: Easy', 'Incorrect')).toHaveTextContent('1')
    const recent = within(
      screen.getByRole('region', { name: 'Recent sessions' }),
    ).getAllByRole('listitem')
    expect(recent[0].querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-10-21T11:00:00Z',
    )
    expect(recent[1].querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-10-21T10:00:00Z',
    )
    expect(within(recent[0]).getByText('50%')).toBeInTheDocument()
    expect(within(recent[0]).getByText('division')).toBeInTheDocument()
  })
  it('does not clear data until confirmed and supports Escape, focus containment, and cancellation', async () => {
    const user = userEvent.setup()
    seed()
    await mount()
    const reset = screen.getByRole('button', { name: 'Reset Statistics' })
    await user.click(reset)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(cancel).toHaveFocus()
    await user.tab({ shift: true })
    expect(
      screen.getByRole('button', { name: 'Yes, reset statistics' }),
    ).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(reset).toHaveFocus()
    expect(storageService.loadAttempts()).toHaveLength(2)
    await user.click(reset)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(storageService.loadSessions()).toHaveLength(2)
  })
  it('clears history and aggregate stats while preserving settings, patterns, and unrelated data', async () => {
    const user = userEvent.setup()
    seed()
    storageService.saveSettings({
      ...defaultSettings,
      animationsEnabled: false,
    })
    const savedPatterns = localStorage.getItem('mathPractice.mistakePatterns')
    expect(storageService.loadMistakePatterns()).toHaveLength(1)
    localStorage.setItem('unrelated', 'keep')
    localStorage.setItem('mathPractice.statistics', '{"attempted":999}')
    await mount()
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, reset statistics' }),
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('have been reset')
    expect(total('Overall totals', 'Attempted')).toHaveTextContent('0')
    const fresh = createStorageService()
    expect(fresh.loadAttempts()).toEqual([])
    expect(fresh.loadSessions()).toEqual([])
    expect(
      JSON.parse(localStorage.getItem('mathPractice.statistics')!).attempted,
    ).toBe(0)
    expect(fresh.loadSettings().animationsEnabled).toBe(false)
    expect(localStorage.getItem('mathPractice.mistakePatterns')).toBe(
      savedPatterns,
    )
    expect(localStorage.getItem('unrelated')).toBe('keep')
  })
  it('retains statistics after leaving and reopening the page', async () => {
    seed()
    const view = await mount()
    view.unmount()
    await mount()
    expect(total('Overall totals', 'Accuracy')).toHaveTextContent('50%')
  })
})
