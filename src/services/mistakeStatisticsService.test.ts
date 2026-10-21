import { describe, expect, it } from 'vitest'
import { calculateMistakeStatistics } from './mistakeStatisticsService'
import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt } from '../types/session'

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
const attempt: PracticeAttempt = {
  id: 'a1',
  questionId: 'q1',
  sessionId: 's1',
  operation: 'addition',
  firstOperand: 2,
  secondOperand: 3,
  correctAnswer: 5,
  selectedAnswer: 4,
  selfReportedCorrect: true,
  source: 'mistake-review',
  mistakePatternId: 'p1',
  difficulty: 1,
  attemptedAt: pattern.lastIncorrectAt,
}

describe('advanced mistake statistics', () => {
  it('returns zero counts and empty rankings without data', () => {
    expect(calculateMistakeStatistics([], [])).toEqual({
      activePatterns: [],
      masteredPatterns: [],
      reviewAttempted: 0,
      reviewCorrect: 0,
      mostMissedOperations: [],
      mostMissedOperationCount: 0,
      frequentFacts: [],
    })
  })
  it('counts active/mastered patterns and actual review attempts, independently of reset mastery progress', () => {
    const mastered = {
      ...pattern,
      id: 'p2',
      difficulty: 2 as const,
      mastered: true,
      similarCorrectCount: 3,
    }
    const attempts = [
      attempt,
      { ...attempt, id: 'a2', selfReportedCorrect: false },
      { ...attempt, id: 'a3', source: 'regular' as const },
    ]
    const stats = calculateMistakeStatistics([pattern, mastered], attempts)
    expect(stats.activePatterns).toHaveLength(1)
    expect(stats.masteredPatterns).toHaveLength(1)
    expect(stats.reviewAttempted).toBe(2)
    expect(stats.reviewCorrect).toBe(1)
  })
  it('combines matching facts across levels and preserves all tied operations and facts', () => {
    const patterns: MistakePattern[] = [
      pattern,
      { ...pattern, id: 'p2', difficulty: 2, incorrectCount: 3 },
      {
        ...pattern,
        id: 'p3',
        operation: 'division',
        firstOperand: 10,
        secondOperand: 2,
        correctAnswer: 5,
        incorrectCount: 5,
      },
    ]
    const stats = calculateMistakeStatistics(patterns, [])
    expect(stats.mostMissedOperations).toEqual(['addition', 'division'])
    expect(stats.mostMissedOperationCount).toBe(5)
    expect(stats.frequentFacts).toHaveLength(2)
    expect(stats.frequentFacts.map((fact) => fact.incorrectCount)).toEqual([
      5, 5,
    ])
  })
  it('sorts by miss count and resolves ties by date and ID without mutating inputs', () => {
    const patterns = [
      pattern,
      {
        ...pattern,
        id: 'p2',
        firstOperand: 1,
        correctAnswer: 4,
        lastIncorrectAt: '2026-10-21T11:00:00Z',
      },
      { ...pattern, id: 'p3', incorrectCount: 4 },
    ]
    const original = structuredClone(patterns)
    expect(
      calculateMistakeStatistics(patterns, []).activePatterns.map(
        (item) => item.id,
      ),
    ).toEqual(['p3', 'p2', 'p1'])
    expect(patterns).toEqual(original)
  })
  it('retains pattern rankings when attempt history has been reset', () => {
    const stats = calculateMistakeStatistics(
      [{ ...pattern, mastered: true }],
      [],
    )
    expect(stats.activePatterns).toEqual([])
    expect(stats.masteredPatterns).toHaveLength(1)
    expect(stats.mostMissedOperations).toEqual(['addition'])
    expect(stats.reviewAttempted).toBe(0)
  })
})
