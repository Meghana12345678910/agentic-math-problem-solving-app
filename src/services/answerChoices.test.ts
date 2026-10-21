import { describe, expect, it, vi } from 'vitest'
import { generateAnswerChoices } from './answerChoices'
import type { AnswerChoiceInput } from './answerChoices'
import type { MathOperation } from '../types/question'

function question(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  correctAnswer: number,
): AnswerChoiceInput {
  return { operation, firstOperand, secondOperand, correctAnswer }
}

function withCandidateIndexes(
  input: AnswerChoiceInput,
  indexes: number[],
  count: number,
) {
  const values = indexes.map((index) => (index + 0.1) / count)
  return generateAnswerChoices(input, () => values.shift() ?? 0)
}

describe('Phase 5 answer choices', () => {
  it('uses addition errors including a missed carry', () => {
    const choices = withCandidateIndexes(
      question('addition', 58, 27, 85),
      [0, 1, 2],
      5,
    )
    expect(new Set(choices)).toEqual(new Set([85, 84, 86, 75]))
  })

  it('uses subtraction errors including an extra borrow', () => {
    const choices = withCandidateIndexes(
      question('subtraction', 82, 27, 55),
      [0, 1, 3],
      5,
    )
    expect(new Set(choices)).toEqual(new Set([55, 54, 56, 45]))
  })

  it('uses nearby multiplication facts', () => {
    const choices = withCandidateIndexes(
      question('multiplication', 8, 7, 56),
      [0, 1, 2],
      4,
    )
    expect(new Set(choices)).toEqual(new Set([56, 49, 63, 48]))
  })

  it('uses adjacent division facts and the other fact-family factor', () => {
    const choices = withCandidateIndexes(
      question('division', 120, 10, 12),
      [0, 1, 2],
      5,
    )
    expect(new Set(choices)).toEqual(new Set([12, 11, 13, 10]))
  })

  it.each([
    question('addition', 0, 0, 0),
    question('addition', 0, 1, 1),
    question('subtraction', 10, 10, 0),
    question('subtraction', 10, 9, 1),
    question('multiplication', 0, 5, 0),
    question('multiplication', 1, 1, 1),
    question('division', 0, 5, 0),
    question('division', 5, 5, 1),
  ])('handles near-zero answers for $operation ($correctAnswer)', (input) => {
    for (const value of [0, 0.25, 0.5, 0.999999]) {
      const choices = generateAnswerChoices(input, () => value)
      expect(choices).toHaveLength(4)
      expect(new Set(choices).size).toBe(4)
      expect(
        choices.filter((choice) => choice === input.correctAnswer),
      ).toHaveLength(1)
      expect(
        choices.every((choice) => Number.isSafeInteger(choice) && choice >= 0),
      ).toBe(true)
      expect(
        choices.every((choice) => Math.abs(choice - input.correctAnswer) <= 3),
      ).toBe(true)
    }
  })

  it('bounds repeated invalid candidates and falls back to nearby numbers', () => {
    const random = vi.fn(() => 0)
    const choices = generateAnswerChoices(
      question('multiplication', 0, 0, 0),
      random,
    )
    expect([...choices].sort()).toEqual([0, 1, 2, 3])
    // Twelve candidate attempts, followed by three Fisher–Yates steps.
    expect(random).toHaveBeenCalledTimes(15)
  })

  it('rejects fractions, unsafe numbers, negative numbers, and zero divisors', () => {
    const input = question('addition', 2, 3, 5)
    for (const answer of [
      -1,
      1.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() =>
        generateAnswerChoices({ ...input, correctAnswer: answer }),
      ).toThrow(RangeError)
    }
    expect(() => generateAnswerChoices(question('division', 5, 0, 5))).toThrow(
      RangeError,
    )
    expect(() =>
      generateAnswerChoices({
        ...input,
        operation: 'invalid' as MathOperation,
      }),
    ).toThrow(RangeError)
  })

  it('shuffles without changing the input or fixing the correct position', () => {
    const input = question('multiplication', 8, 7, 56)
    const original = { ...input }
    const positions = new Set<number>()
    let seed = 4321
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0
      return seed / 4294967296
    }
    for (let index = 0; index < 100; index += 1) {
      const choices = generateAnswerChoices(input, random)
      expect(choices).toHaveLength(4)
      expect(new Set(choices).size).toBe(4)
      expect(choices.filter((choice) => choice === 56)).toHaveLength(1)
      positions.add(choices.indexOf(56))
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3])
    expect(input).toEqual(original)
  })
})
