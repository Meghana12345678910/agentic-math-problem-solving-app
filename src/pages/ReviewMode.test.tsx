import { renderReady as render } from '../test/renderReady'
import { act, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestRouter as MemoryRouter } from '../test/TestRouter'
import { describe, expect, it } from 'vitest'
import App from '../App'
import {
  eligiblePatterns,
  prioritizePatterns,
  reviewPriority,
  createReviewGenerator,
} from '../services/reviewService'
import {
  storageService,
  defaultSettings,
  createStorageService,
} from '../services/storageService'
import { usePracticeSession } from '../hooks/usePracticeSession'
import type { MistakePattern } from '../types/mistake'
import type { PracticeConfiguration } from '../types/practiceConfiguration'

const pattern: MistakePattern = {
  id: 'p1',
  operation: 'addition',
  firstOperand: 2,
  secondOperand: 3,
  correctAnswer: 5,
  difficulty: 1,
  incorrectCount: 1,
  similarCorrectCount: 0,
  lastIncorrectAt: '2026-10-21T10:00:00Z',
  mastered: false,
}
const config: PracticeConfiguration = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
  mode: 'mistake-review',
}
function seed(patterns = [pattern]) {
  storageService.saveMistakePatterns(patterns)
}
async function mount(path = '/practice/setup', state?: unknown) {
  await render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Phase 14 review priority', () => {
  it('prefers frequent and recent misses and less successful review', () => {
    const now = Date.parse('2026-10-21T12:00:00Z')
    expect(
      reviewPriority({ ...pattern, incorrectCount: 3 }, now),
    ).toBeGreaterThan(reviewPriority(pattern, now))
    expect(reviewPriority(pattern, now)).toBeGreaterThan(
      reviewPriority(
        { ...pattern, lastIncorrectAt: '2026-09-01T10:00:00Z' },
        now,
      ),
    )
    expect(reviewPriority(pattern, now)).toBeGreaterThan(
      reviewPriority({ ...pattern, similarCorrectCount: 2 }, now),
    )
  })
  it('randomizes equal-priority patterns without changing the input', () => {
    const patterns = [pattern, { ...pattern, id: 'p2' }]
    const values = [0, 0.9]
    expect(prioritizePatterns(patterns, () => values.shift() ?? 0)[0].id).toBe(
      'p2',
    )
    expect(patterns[0].id).toBe('p1')
  })
  it('excludes mastered and mismatched patterns', () => {
    expect(
      eligiblePatterns(
        [
          pattern,
          { ...pattern, id: 'mastered', mastered: true },
          { ...pattern, id: 'level', difficulty: 2 },
          {
            ...pattern,
            id: 'other',
            operation: 'multiplication',
            correctAnswer: 6,
          },
        ],
        config,
      ),
    ).toEqual([pattern])
  })
  it('mixes patterns before reusing one and respects selected operations', () => {
    seed([
      pattern,
      { ...pattern, id: 'p2', firstOperand: 3, correctAnswer: 6 },
      { ...pattern, id: 'p3', firstOperand: 4, correctAnswer: 7 },
    ])
    const generate = createReviewGenerator(config)
    const questions = Array.from({ length: 3 }, () => generate()!)
    expect(
      new Set(questions.map((question) => question.mistakePatternId)).size,
    ).toBe(3)
    expect(
      questions.every(
        (question) =>
          question.operation === 'addition' &&
          question.source === 'mistake-review',
      ),
    ).toBe(true)
  })
})

describe('Phase 14 review outcomes', () => {
  it('masters after three correct review answers, persists lineage, and stops early', () => {
    seed()
    const { result } = renderHook(() => usePracticeSession(config))
    for (let i = 0; i < 3; i += 1) {
      const current = result.current
      expect(current.question.mistakePatternId).toBe(pattern.id)
      act(() => {
        current.recordResult(
          current.question.id,
          current.question.choices[0],
          true,
        )
        current.recordResult(
          current.question.id,
          current.question.choices[0],
          true,
        )
      })
    }
    expect(result.current.active).toBe(false)
    expect(result.current.session.attempted).toBe(3)
    expect(result.current.session.completedAt).toBeTruthy()
    const fresh = createStorageService()
    expect(fresh.loadMistakePatterns()[0]).toMatchObject({
      mastered: true,
      similarCorrectCount: 3,
    })
    expect(fresh.loadAttempts()).toHaveLength(3)
    expect(
      fresh
        .loadAttempts()
        .every((attempt) => attempt.mistakePatternId === 'p1'),
    ).toBe(true)
  })
  it('resets progress and increments the parent on a wrong review answer', () => {
    seed([{ ...pattern, similarCorrectCount: 2 }])
    const { result } = renderHook(() => usePracticeSession(config))
    const current = result.current
    act(() =>
      current.recordResult(
        current.question.id,
        current.question.choices[0],
        false,
      ),
    )
    expect(storageService.loadMistakePatterns()).toHaveLength(1)
    expect(storageService.loadMistakePatterns()[0]).toMatchObject({
      id: 'p1',
      firstOperand: 2,
      secondOperand: 3,
      incorrectCount: 2,
      similarCorrectCount: 0,
      mastered: false,
    })
  })
  it('uses the configurable threshold', () => {
    seed()
    storageService.saveSettings({ ...defaultSettings, masteryThreshold: 1 })
    const { result } = renderHook(() => usePracticeSession(config))
    const current = result.current
    act(() =>
      current.recordResult(
        current.question.id,
        current.question.choices[0],
        true,
      ),
    )
    expect(result.current.active).toBe(false)
    expect(storageService.loadMistakePatterns()[0].mastered).toBe(true)
  })
  it('reopens a mastered pattern after a future regular mistake', () => {
    seed([{ ...pattern, mastered: true, similarCorrectCount: 3 }])
    storageService.saveAttempt({
      id: 'new-miss',
      questionId: 'new-question',
      sessionId: 'session',
      operation: 'addition',
      firstOperand: 2,
      secondOperand: 3,
      correctAnswer: 5,
      selectedAnswer: 4,
      selfReportedCorrect: false,
      difficulty: 1,
      source: 'regular',
      attemptedAt: new Date().toISOString(),
    })
    expect(storageService.loadMistakePatterns()[0]).toMatchObject({
      id: 'p1',
      mastered: false,
      similarCorrectCount: 0,
      incorrectCount: 2,
    })
    expect(
      eligiblePatterns(storageService.loadMistakePatterns(), config),
    ).toHaveLength(1)
  })
})

describe('Phase 14 review UI', () => {
  it('disables and explains review without active matching patterns', async () => {
    await mount()
    expect(
      screen.getByRole('radio', { name: 'Regular practice' }),
    ).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Mistake review' })).toBeDisabled()
    expect(
      screen.getByText(/Active mistake patterns for these choices: 0/),
    ).toBeInTheDocument()
  })
  it('enables matching review, starts it, and reports review counts in the summary', async () => {
    const user = userEvent.setup()
    seed()
    storageService.saveSettings({ ...defaultSettings, masteryThreshold: 1 })
    await mount()
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    expect(
      screen.getByText(/Active mistake patterns for these choices: 1/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Mistake review' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    await user.click(screen.getAllByRole('button', { name: /^Answer / })[0])
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    expect(
      await screen.findByRole('heading', { name: 'Session summary' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Mistake-review questions completed', { selector: 'dt' })
        .nextElementSibling,
    ).toHaveTextContent('1')
    expect(
      screen.getByRole('button', { name: 'Practice Mistakes' }),
    ).toBeDisabled()
  })
  it('redirects a stale review configuration when all matching patterns are mastered', async () => {
    seed([{ ...pattern, mastered: true }])
    await mount('/practice/session', { configuration: config })
    expect(
      await screen.findByRole('heading', { name: 'Practice setup' }),
    ).toBeInTheDocument()
  })
  it('enables the summary Practice Mistakes action for matching active patterns', async () => {
    const user = userEvent.setup()
    seed()
    await mount('/practice/summary', {
      summary: {
        session: {
          ...config,
          id: 'finished',
          startedAt: '2026-10-21T10:00:00Z',
          completedAt: '2026-10-21T11:00:00Z',
          attempted: 1,
          correct: 0,
          incorrect: 1,
        },
        mistakeReviewCount: 0,
      },
    })
    await user.click(screen.getByRole('link', { name: 'Practice Mistakes' }))
    expect(
      await screen.findByRole('heading', { name: 'Practice session' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 5')).toBeInTheDocument()
  })
  it('saves a mastery threshold in Settings', async () => {
    const user = userEvent.setup()
    await mount('/settings')
    const input = screen.getByRole('spinbutton', {
      name: 'Correct similar answers required for mastery',
    })
    await user.clear(input)
    await user.type(input, '2')
    await user.click(screen.getByRole('button', { name: 'Save Settings' }))
    expect(storageService.loadSettings().masteryThreshold).toBe(2)
  })
})
