import { act, render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { updateMistakePatterns } from './mistakeService'
import { createStorageService, isMistakePattern } from './storageService'
import { usePracticeSession } from '../hooks/usePracticeSession'
import type { PracticeAttempt } from '../types/session'
import type { MistakePattern } from '../types/mistake'
import type { MathOperation } from '../types/question'
import App from '../App'

const attempt: PracticeAttempt = {
  id: 'attempt-1',
  sessionId: 'session-1',
  questionId: 'question-1',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  correctAnswer: 56,
  selectedAnswer: 54,
  selfReportedCorrect: false,
  difficulty: 2,
  source: 'regular',
  attemptedAt: '2026-10-21T10:00:00Z',
}
const pattern: MistakePattern = {
  id: 'pattern-1',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  correctAnswer: 56,
  difficulty: 2,
  incorrectCount: 1,
  similarCorrectCount: 0,
  mastered: false,
  lastIncorrectAt: attempt.attemptedAt,
}

describe('Phase 12 mistake tracking', () => {
  it.each([
    ['addition', 2, 3, 5],
    ['subtraction', 5, 3, 2],
    ['multiplication', 7, 8, 56],
    ['division', 56, 7, 8],
  ] as const)(
    'creates all required fields for %s',
    (operation, firstOperand, secondOperand, correctAnswer) => {
      const [created] = updateMistakePatterns([], {
        ...attempt,
        operation,
        firstOperand,
        secondOperand,
        correctAnswer,
      })
      expect(created).toMatchObject({
        operation,
        firstOperand,
        secondOperand,
        correctAnswer,
        difficulty: 2,
        incorrectCount: 1,
        similarCorrectCount: 0,
        mastered: false,
        lastIncorrectAt: attempt.attemptedAt,
      })
      expect(created.id).not.toBe('')
    },
  )
  it('increments repeated mistakes while retaining identity and resetting prior progress', () => {
    const original = {
      ...pattern,
      incorrectCount: 3,
      similarCorrectCount: 3,
      mastered: true,
    }
    const timestamp = '2026-10-21T11:00:00Z'
    const updated = updateMistakePatterns([original], {
      ...attempt,
      attemptedAt: timestamp,
    })
    expect(updated).toHaveLength(1)
    expect(updated[0]).toEqual({
      ...pattern,
      incorrectCount: 4,
      lastIncorrectAt: timestamp,
    })
    expect(original.mastered).toBe(true)
    expect(original.similarCorrectCount).toBe(3)
  })
  it('does not create patterns or increase review progress for self-reported correct answers', () => {
    expect(
      updateMistakePatterns([], { ...attempt, selfReportedCorrect: true }),
    ).toEqual([])
    expect(
      updateMistakePatterns([pattern], {
        ...attempt,
        selfReportedCorrect: true,
      }),
    ).toEqual([pattern])
  })
  it('keeps ordered operands, operation, and difficulty separate', () => {
    let patterns = updateMistakePatterns([pattern], {
      ...attempt,
      firstOperand: 8,
      secondOperand: 7,
    })
    patterns = updateMistakePatterns(patterns, { ...attempt, difficulty: 3 })
    patterns = updateMistakePatterns(patterns, {
      ...attempt,
      operation: 'addition',
      correctAnswer: 15,
    })
    expect(patterns).toHaveLength(4)
    expect(new Set(patterns.map((item) => item.id)).size).toBe(4)
  })
  it('persists repeated mistakes across fresh storage instances and ignores duplicate attempts', () => {
    const first = createStorageService()
    first.saveAttempt(attempt)
    const original = first.loadMistakePatterns()[0]
    const reopened = createStorageService()
    reopened.saveAttempt(attempt)
    expect(reopened.loadMistakePatterns()[0].incorrectCount).toBe(1)
    reopened.saveAttempt({
      ...attempt,
      id: 'attempt-2',
      questionId: 'question-2',
      attemptedAt: '2026-10-21T11:00:00Z',
    })
    expect(createStorageService().loadMistakePatterns()[0]).toMatchObject({
      id: original.id,
      incorrectCount: 2,
      lastIncorrectAt: '2026-10-21T11:00:00Z',
    })
  })
  it('uses the self-report even when the selected answer was mathematically correct', () => {
    const service = createStorageService()
    service.saveAttempt({ ...attempt, selectedAnswer: 56 })
    expect(service.loadMistakePatterns()).toHaveLength(1)
  })
  it('filters invalid records while retaining valid patterns and unrelated data', () => {
    localStorage.setItem(
      'mathPractice.mistakePatterns',
      JSON.stringify([
        pattern,
        null,
        { ...pattern, id: 'bad', incorrectCount: -1 },
      ]),
    )
    localStorage.setItem('other-app', 'keep')
    const service = createStorageService()
    expect(service.loadMistakePatterns()).toEqual([pattern])
    expect(service.getWarning()).not.toBe('')
    expect(localStorage.getItem('other-app')).toBe('keep')
    service.saveAttempt({ ...attempt, id: 'new', questionId: 'new' })
    expect(createStorageService().loadMistakePatterns()[0].incorrectCount).toBe(
      2,
    )
  })
  it.each(['broken JSON', '{}', 'null'])(
    'recovers safely from malformed pattern storage %s',
    (raw) => {
      localStorage.setItem('mathPractice.mistakePatterns', raw)
      const service = createStorageService()
      expect(service.loadMistakePatterns()).toEqual([])
      expect(service.getWarning()).not.toBe('')
    },
  )
  it('consolidates duplicate stored facts without inflating their count', () => {
    localStorage.setItem(
      'mathPractice.mistakePatterns',
      JSON.stringify([
        pattern,
        {
          ...pattern,
          id: 'duplicate',
          incorrectCount: 4,
          lastIncorrectAt: '2026-10-21T12:00:00Z',
        },
      ]),
    )
    const loaded = createStorageService().loadMistakePatterns()
    expect(loaded).toHaveLength(1)
    expect(loaded[0]).toMatchObject({
      id: pattern.id,
      incorrectCount: 4,
      lastIncorrectAt: '2026-10-21T12:00:00Z',
    })
  })
  it('rejects invalid arithmetic, fields, and duplicate writes', () => {
    for (const changed of [
      { incorrectCount: 0 },
      { similarCorrectCount: -1 },
      { mastered: 'yes' },
      { lastIncorrectAt: 'invalid' },
      { difficulty: 5 },
      { correctAnswer: 55 },
      { operation: 'division', secondOperand: 0 },
      { firstOperand: 1.5 },
      { operation: 'invalid' as MathOperation },
    ])
      expect(isMistakePattern({ ...pattern, ...changed })).toBe(false)
    expect(() =>
      createStorageService().saveMistakePatterns([
        pattern,
        { ...pattern, id: 'duplicate' },
      ]),
    ).toThrow()
  })
  it('retains missed patterns in memory when writes fail', () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new DOMException('Full', 'QuotaExceededError')
      }),
    } as unknown as Storage
    const service = createStorageService(() => storage)
    service.saveAttempt(attempt)
    service.saveAttempt({ ...attempt, id: 'second', questionId: 'second' })
    expect(service.loadMistakePatterns()[0].incorrectCount).toBe(2)
    expect(service.loadAttempts()).toHaveLength(2)
  })
  it('records exactly one mistake through the session hook', () => {
    const { result } = renderHook(() =>
      usePracticeSession({
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 5,
      }),
    )
    const first = result.current
    act(() => {
      first.recordResult(first.question.id, first.question.correctAnswer, false)
      first.recordResult(first.question.id, first.question.correctAnswer, false)
    })
    expect(createStorageService().loadMistakePatterns()).toHaveLength(1)
    expect(createStorageService().loadMistakePatterns()[0].incorrectCount).toBe(
      1,
    )
  })
  it('validates saved patterns at startup without opening a practice session', async () => {
    localStorage.setItem('mathPractice.mistakePatterns', JSON.stringify([{}]))
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'keep practicing',
    )
  })
})
