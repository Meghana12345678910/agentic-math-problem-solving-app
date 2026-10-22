import { renderReady as render } from '../test/renderReady'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { TestRouter } from '../test/TestRouter'
import {
  createStorageService,
  defaultSettings,
  storageService,
} from '../services/storageService'
import { isValidQuestion } from '../services/questionGenerator'

beforeEach(() => storageService.clearActiveSession())
afterEach(() => vi.restoreAllMocks())
const mount = async (path = '/') =>
  await render(
    <TestRouter initialEntries={[path]}>
      <App />
    </TestRouter>,
  )
type User = ReturnType<typeof userEvent.setup>
async function answer(user: User, correct: boolean) {
  await user.click(screen.getAllByRole('button', { name: /^Answer / })[0])
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: correct ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}
async function start(user: User, length = '5 questions') {
  await user.click(screen.getByRole('link', { name: 'Start Practice' }))
  await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
  await user.click(screen.getByRole('radio', { name: length }))
  await user.click(screen.getByRole('button', { name: 'Start Session' }))
}
function total(label: string) {
  return within(
    screen.getByRole('region', { name: 'Overall totals' }),
  ).getByText(label, { selector: 'dt' }).nextElementSibling
}
// Move through the actual tab order, without clicking or assigning focus.
async function tabTo(user: User, target: HTMLElement) {
  for (let index = 0; index < 40 && document.activeElement !== target; index++)
    await user.tab()
  expect(target).toHaveFocus()
}

describe('Phase 20 complete application flows', () => {
  it.each([true, false])(
    'finishes an addition session entirely by keyboard with all self-reports %s',
    async (correct) => {
      const user = userEvent.setup()
      await mount()
      await tabTo(user, screen.getByRole('link', { name: 'Start Practice' }))
      await user.keyboard('{Enter}')
      await tabTo(user, screen.getByRole('checkbox', { name: 'Addition' }))
      await user.keyboard(' ')
      await tabTo(user, screen.getByRole('radio', { name: '10 questions' }))
      await user.keyboard('{ArrowLeft}')
      expect(screen.getByRole('radio', { name: '5 questions' })).toBeChecked()
      await tabTo(user, screen.getByRole('button', { name: 'Start Session' }))
      await user.keyboard('{Enter}')
      for (let index = 0; index < 5; index++) {
        expect(
          screen.getByText(`Question ${index + 1} of 5`),
        ).toBeInTheDocument()
        expect(
          await screen.findByRole('heading', { name: /equals what/ }),
        ).toHaveFocus()
        await user.keyboard('1')
        await tabTo(user, screen.getByRole('button', { name: 'Flip Card' }))
        await user.keyboard('{Enter}')
        expect(
          await screen.findByRole('heading', { name: 'Answer revealed' }),
        ).toHaveFocus()
        await tabTo(
          user,
          screen.getByRole('button', {
            name: correct ? 'I Got It Right' : 'I Got It Wrong',
          }),
        )
        await user.keyboard(' ')
      }
      expect(
        await screen.findByRole('heading', { name: 'Session summary' }),
      ).toHaveFocus()
      expect(screen.getByText(correct ? '100%' : '0%')).toBeInTheDocument()
      const fresh = createStorageService()
      expect(fresh.loadAttempts()).toHaveLength(5)
      expect(
        fresh
          .loadAttempts()
          .every(
            (a) =>
              a.operation === 'addition' && a.selfReportedCorrect === correct,
          ),
      ).toBe(true)
      expect(fresh.loadSessions()[0]).toMatchObject({
        attempted: 5,
        correct: correct ? 5 : 0,
        incorrect: correct ? 0 : 5,
      })
      expect(fresh.loadSessions()[0].completedAt).toBeDefined()
      expect(
        fresh
          .loadMistakePatterns()
          .reduce((sum, p) => sum + p.incorrectCount, 0),
      ).toBe(correct ? 0 : 5)
      expect(fresh.loadActiveSession()).toBeNull()
    },
    60000,
  )

  it('runs all four operations through setup, twenty cards, summary, and statistics', async () => {
    let seed = 42
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    })
    const user = userEvent.setup()
    await mount('/practice/setup')
    await user.click(
      screen.getByRole('button', { name: 'Select all operations' }),
    )
    await user.click(screen.getByRole('radio', { name: 'Level 2: Easy' }))
    await user.click(screen.getByRole('radio', { name: '20 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    const seen = new Set<string>()
    for (let index = 0; index < 20; index++) {
      const saved = createStorageService().loadActiveSession()!
      expect(isValidQuestion(saved.question)).toBe(true)
      expect(saved.question.difficulty).toBe(2)
      seen.add(saved.question.operation)
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'value',
        String(index),
      )
      await answer(user, index % 2 === 0)
    }
    expect([...seen].sort()).toEqual([
      'addition',
      'division',
      'multiplication',
      'subtraction',
    ])
    expect(screen.getByText('50%')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await screen.findByRole('heading', { name: 'Statistics', level: 1 })
    expect(total('Attempted')).toHaveTextContent('20')
    expect(total('Correct')).toHaveTextContent('10')
    expect(total('Incorrect')).toHaveTextContent('10')
    expect(total('Accuracy')).toHaveTextContent('50%')
    const attempts = createStorageService().loadAttempts()
    expect(attempts).toHaveLength(20)
    expect(new Set(attempts.map((a) => a.questionId)).size).toBe(20)
  }, 60000)

  it('creates a mistake, reviews related questions to mastery, and resets history while preserving mastery', async () => {
    storageService.saveSettings({ ...defaultSettings, soundEnabled: true })
    const user = userEvent.setup()
    await mount()
    await start(user)
    await answer(user, false)
    for (let index = 0; index < 4; index++) await answer(user, true)
    const parent = createStorageService().loadMistakePatterns()[0]
    expect(parent.incorrectCount).toBe(1)
    await user.click(screen.getByRole('link', { name: 'Practice Mistakes' }))
    for (let index = 0; index < 3; index++) {
      const question = createStorageService().loadActiveSession()!.question
      expect(isValidQuestion(question)).toBe(true)
      expect(question.source).toBe('mistake-review')
      expect(question.mistakePatternId).toBe(parent.id)
      expect([
        question.operation,
        question.firstOperand,
        question.secondOperand,
      ]).not.toEqual([
        parent.operation,
        parent.firstOperand,
        parent.secondOperand,
      ])
      await answer(user, true)
    }
    expect(
      await screen.findByRole('heading', { name: 'Session summary' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toBeDisabled()
    expect(createStorageService().loadMistakePatterns()[0]).toMatchObject({
      id: parent.id,
      similarCorrectCount: 3,
      mastered: true,
    })
    expect(
      createStorageService()
        .loadAttempts()
        .filter((a) => a.source === 'mistake-review'),
    ).toHaveLength(3)
    await user.click(screen.getByRole('link', { name: 'View Statistics' }))
    await screen.findByRole('heading', { name: 'Statistics', level: 1 })
    expect(total('Attempted')).toHaveTextContent('8')
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(createStorageService().loadAttempts()).toHaveLength(8)
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, reset statistics' }),
    )
    expect(total('Attempted')).toHaveTextContent('0')
    const fresh = createStorageService()
    expect(fresh.loadAttempts()).toEqual([])
    expect(fresh.loadSessions()).toEqual([])
    expect(fresh.loadSettings().soundEnabled).toBe(true)
    expect(fresh.loadMistakePatterns()[0].mastered).toBe(true)
  }, 60000)

  it('continues beyond twenty questions until explicitly ended', async () => {
    const user = userEvent.setup()
    await mount()
    await start(user, 'Continuous practice')
    for (let index = 0; index < 21; index++) await answer(user, true)
    expect(screen.getByText(/Question 22/)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(screen.getByRole('button', { name: 'Keep practicing' }))
    expect(createStorageService().loadSessions()[0].completedAt).toBeUndefined()
    await user.click(screen.getByRole('button', { name: 'End Session' }))
    await user.click(screen.getByRole('button', { name: 'Yes, end session' }))
    expect(
      await screen.findByRole('heading', { name: 'Session summary' }),
    ).toBeInTheDocument()
    expect(createStorageService().loadSessions()[0]).toMatchObject({
      attempted: 21,
      correct: 21,
    })
    expect(createStorageService().loadActiveSession()).toBeNull()
  }, 60000)

  it('finishes after a simulated refresh without losing or duplicating completed answers', async () => {
    const user = userEvent.setup()
    const view = await mount()
    await start(user)
    await answer(user, false)
    await answer(user, true)
    await user.click(screen.getAllByRole('button', { name: /^Answer / })[0])
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    const saved = createStorageService().loadActiveSession()!
    view.unmount()
    // Remount without history state, using the serialized snapshot as a refresh would.
    await mount('/practice/session')
    expect(screen.getByText('Question 3 of 5')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Answer revealed' }),
    ).toHaveFocus()
    expect(createStorageService().loadActiveSession()!.question.id).toBe(
      saved.question.id,
    )
    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    await answer(user, true)
    await answer(user, false)
    const fresh = createStorageService()
    expect(fresh.loadAttempts()).toHaveLength(5)
    expect(new Set(fresh.loadAttempts().map((a) => a.questionId)).size).toBe(5)
    expect(fresh.loadSessions()).toHaveLength(1)
    expect(fresh.loadSessions()[0]).toMatchObject({
      id: saved.session.id,
      attempted: 5,
      correct: 3,
      incorrect: 2,
    })
    expect(fresh.loadActiveSession()).toBeNull()
    expect(screen.getByText('60%')).toBeInTheDocument()
  }, 60000)
})
