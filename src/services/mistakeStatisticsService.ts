import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt } from '../types/session'
import type { MathOperation } from '../types/question'

export function calculateMistakeStatistics(
  patterns: readonly MistakePattern[],
  attempts: readonly PracticeAttempt[],
) {
  const byOperation: Record<MathOperation, number> = {
    addition: 0,
    subtraction: 0,
    multiplication: 0,
    division: 0,
  }
  const facts = new Map<
    string,
    {
      operation: MathOperation
      firstOperand: number
      secondOperand: number
      incorrectCount: number
    }
  >()
  for (const pattern of patterns) {
    byOperation[pattern.operation] += pattern.incorrectCount
    const key = [
      pattern.operation,
      pattern.firstOperand,
      pattern.secondOperand,
    ].join(':')
    const previous = facts.get(key)
    facts.set(key, {
      operation: pattern.operation,
      firstOperand: pattern.firstOperand,
      secondOperand: pattern.secondOperand,
      incorrectCount: (previous?.incorrectCount ?? 0) + pattern.incorrectCount,
    })
  }
  const highestOperationCount = Math.max(...Object.values(byOperation))
  const mostMissedOperations = (
    Object.keys(byOperation) as MathOperation[]
  ).filter(
    (operation) =>
      highestOperationCount > 0 &&
      byOperation[operation] === highestOperationCount,
  )
  const frequentFacts = [...facts.values()].sort(
    (a, b) =>
      b.incorrectCount - a.incorrectCount ||
      a.operation.localeCompare(b.operation) ||
      a.firstOperand - b.firstOperand ||
      a.secondOperand - b.secondOperand,
  )
  const sorted = [...patterns].sort(
    (a, b) =>
      b.incorrectCount - a.incorrectCount ||
      Date.parse(b.lastIncorrectAt) - Date.parse(a.lastIncorrectAt) ||
      a.id.localeCompare(b.id),
  )
  const reviewAttempts = attempts.filter(
    (attempt) => attempt.source === 'mistake-review',
  )
  return {
    activePatterns: sorted.filter((pattern) => !pattern.mastered),
    masteredPatterns: sorted.filter((pattern) => pattern.mastered),
    reviewAttempted: reviewAttempts.length,
    reviewCorrect: reviewAttempts.filter(
      (attempt) => attempt.selfReportedCorrect,
    ).length,
    mostMissedOperations,
    mostMissedOperationCount: highestOperationCount,
    frequentFacts,
  }
}
