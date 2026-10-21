import type { MistakePattern } from '../types/mistake'
import type { PracticeAttempt } from '../types/session'
import { createId } from '../utils/ids'

type Fact = Pick<
  MistakePattern,
  'operation' | 'firstOperand' | 'secondOperand' | 'difficulty'
>

export function mistakePatternKey(fact: Fact): string {
  return [
    fact.operation,
    fact.difficulty,
    fact.firstOperand,
    fact.secondOperand,
  ].join(':')
}

/** A new miss reopens a mastered pattern and resets successful-review progress. */
export function updateMistakePatterns(
  patterns: readonly MistakePattern[],
  attempt: PracticeAttempt,
): MistakePattern[] {
  if (attempt.selfReportedCorrect) return [...patterns]
  const key = mistakePatternKey(attempt)
  const existing = patterns.find(
    (pattern) => mistakePatternKey(pattern) === key,
  )
  const updated: MistakePattern = {
    id: existing?.id ?? createId(),
    operation: attempt.operation,
    firstOperand: attempt.firstOperand,
    secondOperand: attempt.secondOperand,
    correctAnswer: attempt.correctAnswer,
    difficulty: attempt.difficulty,
    incorrectCount: (existing?.incorrectCount ?? 0) + 1,
    similarCorrectCount: 0,
    lastIncorrectAt: attempt.attemptedAt,
    mastered: false,
  }
  return existing
    ? patterns.map((pattern) =>
        mistakePatternKey(pattern) === key ? updated : pattern,
      )
    : [...patterns, updated]
}
