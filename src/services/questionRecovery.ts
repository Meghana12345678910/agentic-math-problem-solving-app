import type { Question } from '../types/question'
import { isValidQuestion } from './questionGenerator'

export const questionRetryLimit = 3

/** Validate before displaying, then use a deterministic fallback after bounded retries. */
export function recoverQuestion(
  generate: () => unknown,
  fallback: () => Question,
): Question {
  for (let attempt = 1; attempt <= questionRetryLimit; attempt += 1) {
    try {
      const question = generate()
      if (isValidQuestion(question)) return question
      throw new Error(
        'Generated question failed arithmetic or choice validation.',
      )
    } catch (error) {
      if (import.meta.env.DEV)
        console.error(
          `Question generation attempt ${attempt}/${questionRetryLimit} failed.`,
          error,
        )
    }
  }
  const question = fallback()
  if (!isValidQuestion(question))
    throw new Error('Fallback question failed validation.')
  return question
}
