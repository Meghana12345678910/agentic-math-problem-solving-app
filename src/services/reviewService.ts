import type { Question } from '../types/question'
import type { MistakePattern } from '../types/mistake'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import type { RandomSource } from '../utils/math'
import { storageService } from './storageService'
import { createSimilarQuestionGenerator } from './similarQuestionGenerator'
import { isValidFact } from './questionGenerator'

export function eligiblePatterns(
  patterns: readonly MistakePattern[],
  config: PracticeConfiguration,
): MistakePattern[] {
  return patterns.filter(
    (pattern) =>
      !pattern.mastered &&
      pattern.difficulty === config.difficulty &&
      config.operations.includes(pattern.operation) &&
      isValidFact(pattern),
  )
}
export function reviewPriority(
  pattern: MistakePattern,
  now = Date.now(),
): number {
  const days = Math.max(0, now - Date.parse(pattern.lastIncorrectAt)) / 86400000
  return (
    pattern.incorrectCount * 4 +
    7 / (1 + days) +
    3 / (1 + pattern.similarCorrectCount)
  )
}
export function prioritizePatterns(
  patterns: readonly MistakePattern[],
  random: RandomSource = Math.random,
  now = Date.now(),
): MistakePattern[] {
  return patterns
    .map((pattern) => ({
      pattern,
      score: reviewPriority(pattern, now) + random(),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.pattern)
}
export function createReviewGenerator(
  config: PracticeConfiguration,
  previousQuestion?: Question,
) {
  const generate = createSimilarQuestionGenerator()
  const used = new Set<string>()
  let previousFact = previousQuestion
    ? [
        previousQuestion.operation,
        previousQuestion.firstOperand,
        previousQuestion.secondOperand,
      ].join(':')
    : ''
  return () => {
    const active = eligiblePatterns(
      storageService.loadMistakePatterns(),
      config,
    )
    if (!active.length) return null
    let pool = active.filter((pattern) => !used.has(pattern.id))
    if (!pool.length) {
      used.clear()
      pool = active
    }
    const pattern = prioritizePatterns(pool)[0]
    used.add(pattern.id)
    let question = generate(pattern, { allowedOperations: config.operations })
    const key = () =>
      [question.operation, question.firstOperand, question.secondOperand].join(
        ':',
      )
    // Different parent patterns can produce the same related fact. The generator's
    // per-pattern history excludes this candidate on the second bounded call.
    if (key() === previousFact)
      question = generate(pattern, { allowedOperations: config.operations })
    previousFact = key()
    return question
  }
}
