import { describe, expect, it } from 'vitest'
import { calculateAccuracy, calculateStatistics } from './statisticsService'
import type { PracticeAttempt } from '../types/session'
import type { DifficultyLevel, MathOperation } from '../types/question'

const operations: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const levels: DifficultyLevel[] = [1, 2, 3, 4]
const attempt = (
  operation: MathOperation,
  difficulty: DifficultyLevel,
  correct: boolean,
): PracticeAttempt => ({
  id: operation + difficulty,
  questionId: operation + difficulty,
  sessionId: 'session',
  operation,
  difficulty,
  firstOperand: 6,
  secondOperand: 2,
  correctAnswer: 8,
  selectedAnswer: 0,
  selfReportedCorrect: correct,
  source: 'regular',
  attemptedAt: '2026-10-21T10:00:00Z',
})

describe('statistics calculations', () => {
  it('initializes all operations and levels with independent zero totals', () => {
    const stats = calculateStatistics([])
    expect(stats.attempted).toBe(0)
    for (const totals of [
      ...Object.values(stats.byOperation),
      ...Object.values(stats.byDifficulty),
    ]) {
      expect(totals).toEqual({ attempted: 0, correct: 0, incorrect: 0 })
    }
    expect(stats.byOperation.addition).not.toBe(stats.byOperation.division)
  })
  it('tracks all four operations and difficulty levels using self-reports', () => {
    const attempts = operations.flatMap((operation, index) =>
      levels.map((level) =>
        attempt(operation, level, (index + level) % 2 === 0),
      ),
    )
    const original = structuredClone(attempts)
    const stats = calculateStatistics(attempts)
    expect(stats).toMatchObject({ attempted: 16, correct: 8, incorrect: 8 })
    for (const operation of operations)
      expect(stats.byOperation[operation]).toEqual({
        attempted: 4,
        correct: 2,
        incorrect: 2,
      })
    for (const level of levels)
      expect(stats.byDifficulty[level]).toEqual({
        attempted: 4,
        correct: 2,
        incorrect: 2,
      })
    expect(attempts).toEqual(original)
  })
  it.each([true, false])('handles all self-reports %s', (correct) => {
    const stats = calculateStatistics(
      operations.map((operation) => attempt(operation, 1, correct)),
    )
    expect(stats.correct).toBe(correct ? 4 : 0)
    expect(stats.incorrect).toBe(correct ? 0 : 4)
  })
  it.each([
    [0, 0, 0],
    [3, 5, 60],
    [2, 3, 67],
    [4, 4, 100],
    [0, 4, 0],
  ])('accuracy for %s/%s is %s', (correct, attempted, expected) => {
    expect(calculateAccuracy(correct, attempted)).toBe(expected)
  })
})
