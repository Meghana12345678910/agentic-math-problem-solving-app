import type { MathOperation, Question } from '../types/question.ts'
import { randomInteger } from '../utils/math.ts'
import type { RandomSource } from '../utils/math.ts'
import { shuffle } from '../utils/shuffle.ts'

export type AnswerChoiceInput = Pick<
  Question,
  'operation' | 'firstOperand' | 'secondOperand' | 'correctAnswer'
>

const maximumCandidateAttempts = 12

/** Keep mistakes close to the answer, including small answers such as 0 and 1. */
export function distractorDistance(answer: number): number {
  return Math.max(3, Math.ceil(answer * 0.2))
}

function operationCandidates(
  operation: MathOperation,
  first: number,
  second: number,
  answer: number,
): number[] {
  switch (operation) {
    case 'addition':
      // Off by one and forgetting or adding a carry.
      return [
        answer - 1,
        answer + 1,
        answer - 10,
        answer + 10,
        Math.abs(first - second),
      ]
    case 'subtraction':
      // Off by one, subtracting a ones digit in the wrong direction, or missing a borrow.
      return [
        answer - 1,
        answer + 1,
        answer + 2 * (second % 10),
        answer - 10,
        answer + 10,
      ]
    case 'multiplication':
      return [
        (first - 1) * second,
        (first + 1) * second,
        first * (second - 1),
        first * (second + 1),
      ]
    case 'division':
      // Adjacent dividend facts give neighboring quotients; confusing the two
      // factors in the same fact family gives the divisor instead of the quotient.
      return [answer - 1, answer + 1, second, answer - second, answer + second]
  }
}

export function generateAnswerChoices(
  input: AnswerChoiceInput,
  random: RandomSource = Math.random,
): number[] {
  const {
    operation,
    firstOperand,
    secondOperand,
    correctAnswer: answer,
  } = input
  if (
    ![firstOperand, secondOperand, answer].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    !['addition', 'subtraction', 'multiplication', 'division'].includes(
      operation,
    ) ||
    (operation === 'division' && secondOperand === 0)
  ) {
    throw new RangeError(
      'Answer choices require a supported whole-number question.',
    )
  }
  const candidates = operationCandidates(
    operation,
    firstOperand,
    secondOperand,
    answer,
  )
  const wrong = new Set<number>()
  const addCandidate = (candidate: number) => {
    if (
      Number.isSafeInteger(candidate) &&
      candidate >= 0 &&
      candidate !== answer &&
      Math.abs(candidate - answer) <= distractorDistance(answer)
    ) {
      wrong.add(candidate)
    }
  }

  // Duplicate or invalid candidates must never cause an unbounded retry loop.
  for (
    let attempt = 0;
    attempt < maximumCandidateAttempts && wrong.size < 3;
    attempt += 1
  ) {
    addCandidate(candidates[randomInteger(0, candidates.length - 1, random)])
  }
  // Guaranteed nearby alternatives when operation candidates collide or are negative.
  for (let offset = 1; offset <= 3 && wrong.size < 3; offset += 1) {
    addCandidate(answer - offset)
    if (wrong.size < 3) addCandidate(answer + offset)
  }
  return shuffle([answer, ...wrong], random)
}
