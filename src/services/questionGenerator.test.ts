import { describe, expect, it, vi } from 'vitest'
import type { DifficultyLevel, MathOperation } from '../types/question'
import {
  generateQuestion,
  generateAdditionQuestion,
  generateSubtractionQuestion,
  generateMultiplicationQuestion,
  generateDivisionQuestion,
  isValidQuestion,
} from './questionGenerator'

const operations: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const levels: DifficultyLevel[] = [1, 2, 3, 4]

// Repeatable coverage rather than tests that occasionally fail due to randomness.
function seededRandom() {
  let seed = 12345
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 4294967296
  }
}

describe.each(levels)('difficulty %s', (difficulty) => {
  it.each(operations)(
    'generates safe %s questions with valid choices',
    (operation) => {
      const random = seededRandom()
      const ids = new Set<string>()
      for (let index = 0; index < 150; index += 1) {
        const q = generateQuestion(operation, difficulty, random)
        ids.add(q.id)
        const a = q.firstOperand
        const b = q.secondOperand
        const maximum = [10, 50, 100, 1000][difficulty - 1]
        if (operation === 'addition') {
          expect(a).toBeGreaterThanOrEqual(0)
          expect(a).toBeLessThanOrEqual(maximum)
          expect(b).toBeGreaterThanOrEqual(0)
          expect(b).toBeLessThanOrEqual(maximum)
          expect(q.correctAnswer).toBe(a + b)
          expect(q.correctAnswer).toBeLessThanOrEqual(maximum * 2)
        } else if (operation === 'subtraction') {
          expect(a).toBeLessThanOrEqual(maximum)
          expect(b).toBeGreaterThanOrEqual(0)
          expect(a).toBeGreaterThanOrEqual(b)
          expect(q.correctAnswer).toBe(a - b)
        } else if (operation === 'multiplication') {
          const maxFirst = [5, 10, 9, 99][difficulty - 1]
          const maxSecond = [5, 10, 99, 99][difficulty - 1]
          expect(a).toBeGreaterThanOrEqual(difficulty === 4 ? 10 : 0)
          expect(a).toBeLessThanOrEqual(maxFirst)
          expect(b).toBeGreaterThanOrEqual(0)
          expect(b).toBeLessThanOrEqual(maxSecond)
          expect(q.correctAnswer).toBe(a * b)
        } else {
          expect(b).toBeGreaterThan(0)
          expect(b).toBeLessThanOrEqual([5, 10, 12, 99][difficulty - 1])
          expect(a % b).toBe(0)
          expect(q.correctAnswer).toBe(a / b)
          expect(Number.isInteger(q.correctAnswer)).toBe(true)
          expect(q.correctAnswer).toBeGreaterThanOrEqual(0)
          if (difficulty <= 2)
            expect(q.correctAnswer).toBeLessThanOrEqual(
              difficulty === 1 ? 5 : 10,
            )
          if (difficulty === 3) expect(a).toBeLessThanOrEqual(144)
          if (difficulty === 4) {
            expect(a).toBeGreaterThanOrEqual(100)
            expect(a).toBeLessThanOrEqual(1000)
          }
        }
        expect(q.choices).toHaveLength(4)
        expect(new Set(q.choices).size).toBe(4)
        expect(
          q.choices.filter((choice) => choice === q.correctAnswer),
        ).toHaveLength(1)
        for (const choice of q.choices) {
          expect(Number.isInteger(choice)).toBe(true)
          expect(choice).toBeGreaterThanOrEqual(0)
          expect(Math.abs(choice - q.correctAnswer)).toBeLessThanOrEqual(
            Math.max(3, Math.ceil(q.correctAnswer * 0.2)),
          )
        }
        expect(q.operation).toBe(operation)
        expect(q.difficulty).toBe(difficulty)
        expect(q.source).toBe('regular')
        expect(isValidQuestion(q)).toBe(true)
      }
      expect(ids.size).toBe(150)
    },
  )

  it('reaches exact addition, subtraction, and multiplication boundaries', () => {
    const low = () => 0
    const high = () => 0.999999
    const max = [10, 50, 100, 1000][difficulty - 1]
    expect(generateAdditionQuestion(difficulty, low).correctAnswer).toBe(0)
    const addition = generateAdditionQuestion(difficulty, high)
    expect([
      addition.firstOperand,
      addition.secondOperand,
      addition.correctAnswer,
    ]).toEqual([max, max, max * 2])
    expect(generateSubtractionQuestion(difficulty, low).correctAnswer).toBe(0)
    // Operation selection, then the first and second operand.
    const values = [0, 0.999999, 0]
    const subtraction = generateSubtractionQuestion(
      difficulty,
      () => values.shift() ?? 0,
    )
    expect([
      subtraction.firstOperand,
      subtraction.secondOperand,
      subtraction.correctAnswer,
    ]).toEqual([max, 0, max])
    const multiplication = generateMultiplicationQuestion(difficulty, high)
    expect([multiplication.firstOperand, multiplication.secondOperand]).toEqual(
      [[5, 10, 9, 99][difficulty - 1], [5, 10, 99, 99][difficulty - 1]],
    )
    const minimum = generateMultiplicationQuestion(difficulty, low)
    expect([minimum.firstOperand, minimum.secondOperand]).toEqual([
      difficulty === 4 ? 10 : 0,
      0,
    ])
  })

  it('reaches divisor and dividend or quotient boundaries', () => {
    const low = generateDivisionQuestion(difficulty, () => 0)
    expect(low.secondOperand).toBe(1)
    expect(low.firstOperand).toBe(difficulty === 4 ? 100 : 0)
    const high = generateDivisionQuestion(difficulty, () => 0.999999)
    expect(high.secondOperand).toBe([5, 10, 12, 99][difficulty - 1])
    expect(high.firstOperand).toBe([25, 100, 144, 990][difficulty - 1])
    // With divisor 1, the highest permitted dividend can be reached exactly.
    const values = [0, 0, 0.999999]
    const largest = generateDivisionQuestion(
      difficulty,
      () => values.shift() ?? 0,
    )
    expect(largest.firstOperand).toBe([5, 10, 144, 1000][difficulty - 1])
  })
})

describe('generator validation and randomness', () => {
  it('selects each enabled operation and never selects a disabled operation', () => {
    for (const [index, operation] of operations.entries()) {
      expect(
        generateQuestion(operations, 1, () => (index + 0.1) / 4).operation,
      ).toBe(operation)
    }
    const random = seededRandom()
    for (let index = 0; index < 100; index += 1) {
      expect(['addition', 'division']).toContain(
        generateQuestion(['addition', 'division'], 2, random).operation,
      )
    }
  })
  it('can put the correct answer in every position', () => {
    const positions = new Set<number>()
    const random = seededRandom()
    for (let index = 0; index < 150; index += 1) {
      const q = generateQuestion('addition', 1, random)
      positions.add(q.choices.indexOf(q.correctAnswer))
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3])
  })
  it('handles zero answers and constant random sources without looping', () => {
    for (const operation of operations) {
      const q = generateQuestion(operation, 1, () => 0)
      expect(q.correctAnswer).toBe(0)
      expect([...q.choices].sort()).toEqual([0, 1, 2, 3])
    }
  })
  it('rejects invalid setup and limits unexpected failures', () => {
    expect(() => generateQuestion([], 1)).toThrow(RangeError)
    expect(() => generateQuestion('unknown' as MathOperation, 1)).toThrow(
      RangeError,
    )
    expect(() => generateQuestion('addition', 5 as DifficultyLevel)).toThrow(
      RangeError,
    )
    const broken = vi.fn(() => NaN)
    expect(() => generateQuestion('addition', 1, broken)).toThrow(
      'after 3 attempts',
    )
    expect(broken).toHaveBeenCalledTimes(3)
    const transient = vi.fn().mockReturnValueOnce(NaN).mockReturnValue(0)
    expect(isValidQuestion(generateQuestion('addition', 1, transient))).toBe(
      true,
    )
  })
  it('rejects invalid arithmetic, choices, difficulty, operands, and division', () => {
    const q = generateQuestion('addition', 1, () => 0)
    expect(isValidQuestion({ ...q, correctAnswer: 2 })).toBe(false)
    expect(isValidQuestion({ ...q, choices: [0, 0, 1, 2] })).toBe(false)
    expect(isValidQuestion({ ...q, choices: [1, 2, 3, 4] })).toBe(false)
    expect(isValidQuestion({ ...q, choices: [0, 1, 2] })).toBe(false)
    expect(isValidQuestion({ ...q, choices: [0, 1, -1, 2] })).toBe(false)
    expect(isValidQuestion({ ...q, choices: [0, 1, 1.5, 2] })).toBe(false)
    expect(isValidQuestion({ ...q, firstOperand: 11 })).toBe(false)
    expect(isValidQuestion({ ...q, difficulty: 5 as DifficultyLevel })).toBe(
      false,
    )
    expect(
      isValidQuestion({ ...q, operation: 'unknown' as MathOperation }),
    ).toBe(false)
    expect(
      isValidQuestion({ ...q, operation: 'division', secondOperand: 0 }),
    ).toBe(false)
    const division = generateDivisionQuestion(1, () => 0)
    expect(
      isValidQuestion({
        ...division,
        firstOperand: 1,
        secondOperand: 2,
        correctAnswer: 0.5,
      }),
    ).toBe(false)
  })
})
