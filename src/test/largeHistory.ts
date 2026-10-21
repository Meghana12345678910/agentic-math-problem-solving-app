import type { PracticeAttempt } from '../types/session'

/** Reproducible large-history fixture for automated and disposable-profile browser checks. */
export function createLargeHistory(count: number): PracticeAttempt[] {
  const sessionId = crypto.randomUUID()
  return Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
    questionId: crypto.randomUUID(),
    sessionId,
    operation: 'addition',
    firstOperand: index % 10,
    secondOperand: 3,
    correctAnswer: (index % 10) + 3,
    selectedAnswer: 3,
    difficulty: 1,
    selfReportedCorrect: index % 3 !== 0,
    source: index % 4 === 0 ? 'mistake-review' : 'regular',
    ...(index % 4 === 0 ? { mistakePatternId: 'parent' } : {}),
    attemptedAt: new Date(1760000000000 + index * 1000).toISOString(),
  }))
}
