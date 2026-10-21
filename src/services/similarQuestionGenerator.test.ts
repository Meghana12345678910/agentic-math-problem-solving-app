import { describe, expect, it } from 'vitest'
import {
  createSimilarQuestionGenerator,
  generateSimilarQuestion,
} from './similarQuestionGenerator'
import { generateQuestion, isValidQuestion } from './questionGenerator'
import type {
  MathOperation,
  DifficultyLevel,
  Question,
} from '../types/question'
import type { MistakePattern } from '../types/mistake'

function pattern(
  operation: MathOperation,
  firstOperand: number,
  secondOperand: number,
  correctAnswer: number,
  difficulty: DifficultyLevel = 2,
): MistakePattern {
  return {
    id: operation + firstOperand + '-' + secondOperand + '-' + difficulty,
    operation,
    firstOperand,
    secondOperand,
    correctAnswer,
    difficulty,
    incorrectCount: 1,
    similarCorrectCount: 0,
    mastered: false,
    lastIncorrectAt: '2026-10-21T10:00:00Z',
  }
}
const key = (
  fact: Pick<Question, 'operation' | 'firstOperand' | 'secondOperand'>,
) => [fact.operation, fact.firstOperand, fact.secondOperand].join(':')
function randomSource() {
  let seed = 12345
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 4294967296
  }
}

describe('Phase 13 similar questions', () => {
  it.each([
    [pattern('addition', 3, 4, 7), 'subtraction'],
    [pattern('subtraction', 7, 3, 4), 'addition'],
    [pattern('multiplication', 7, 8, 56), 'division'],
    [pattern('division', 56, 7, 8), 'multiplication'],
  ] as const)(
    'generates inverse fact families for $0.operation',
    (input, expected) => {
      const question = createSimilarQuestionGenerator()(input, {
        strategy: 'fact-family',
        random: () => 0,
      })
      expect(question.operation).toBe(expected)
      expect(question.difficulty).toBe(input.difficulty)
      expect(isValidQuestion(question)).toBe(true)
    },
  )

  it.each([pattern('addition', 3, 4, 7), pattern('multiplication', 7, 8, 56)])(
    'reverses $operation operands',
    (input) => {
      const question = createSimilarQuestionGenerator()(input, {
        strategy: 'reversed',
        random: () => 0,
      })
      expect([question.firstOperand, question.secondOperand]).toEqual([
        input.secondOperand,
        input.firstOperand,
      ])
    },
  )

  it.each([pattern('subtraction', 7, 3, 4), pattern('division', 56, 7, 8)])(
    'does not reverse $operation as an equivalent fact',
    (input) => {
      const generate = createSimilarQuestionGenerator()
      for (let i = 0; i < 10; i += 1) {
        const question = generate(input, {
          strategy: 'reversed',
          random: () => 0,
        })
        expect([
          question.operation,
          question.firstOperand,
          question.secondOperand,
        ]).not.toEqual([
          input.operation,
          input.secondOperand,
          input.firstOperand,
        ])
        expect(isValidQuestion(question)).toBe(true)
      }
    },
  )

  it.each([
    'addition',
    'subtraction',
    'multiplication',
    'division',
  ] as MathOperation[])(
    'creates nearby %s facts without repeating the original',
    (operation) => {
      const input = {
        ...pattern(operation, 0, 0, 0, 1),
        ...generateQuestion(operation, 1, () => 0),
        id: 'near-' + operation,
      }
      const question = generateSimilarQuestion(input, {
        strategy: 'nearby',
        random: () => 0,
      })
      expect(question.operation).toBe(operation)
      expect(key(question)).not.toBe(key(input))
      expect(isValidQuestion(question)).toBe(true)
    },
  )

  it.each([1, 2, 3, 4] as DifficultyLevel[])(
    'preserves level %s boundaries for every operation and strategy',
    (difficulty) => {
      const generate = createSimilarQuestionGenerator()
      const random = randomSource()
      for (const operation of [
        'addition',
        'subtraction',
        'multiplication',
        'division',
      ] as MathOperation[]) {
        for (const boundary of [0, 0.999999]) {
          const seed = generateQuestion(operation, difficulty, () => boundary)
          const input = {
            ...pattern(
              operation,
              seed.firstOperand,
              seed.secondOperand,
              seed.correctAnswer,
              difficulty,
            ),
            id: key(seed) + difficulty,
          }
          let previous = ''
          for (let i = 0; i < 30; i += 1) {
            const question = generate(input, {
              random,
              strategy: (['nearby', 'reversed', 'fact-family'] as const)[i % 3],
            })
            expect(isValidQuestion(question)).toBe(true)
            expect(question.difficulty).toBe(difficulty)
            expect(question.source).toBe('mistake-review')
            expect(question.mistakePatternId).toBe(input.id)
            expect(key(question)).not.toBe(key(input))
            expect(key(question)).not.toBe(previous)
            expect(question.choices).toHaveLength(4)
            expect(new Set(question.choices).size).toBe(4)
            expect(
              question.choices.filter(
                (choice) => choice === question.correctAnswer,
              ),
            ).toHaveLength(1)
            if (question.operation === 'division') {
              expect(question.secondOperand).toBeGreaterThan(0)
              expect(Number.isInteger(question.correctAnswer)).toBe(true)
            }
            previous = key(question)
          }
        }
      }
    },
  )

  it('falls back when inverse or reversed facts exceed difficulty ranges', () => {
    const input = pattern('multiplication', 99, 99, 9801, 4)
    const question = createSimilarQuestionGenerator()(input, {
      strategy: 'fact-family',
      random: () => 0,
    })
    expect(question.operation).toBe('multiplication')
    expect(isValidQuestion(question)).toBe(true)
  })

  it('does not repeat consecutively even with a constant random source', () => {
    const generate = createSimilarQuestionGenerator()
    const input = pattern('multiplication', 8, 7, 56)
    let previous = ''
    const original = { ...input }
    for (let i = 0; i < 30; i += 1) {
      const question = generate(input, { random: () => 0 })
      expect(key(question)).not.toBe(previous)
      previous = key(question)
    }
    expect(input).toEqual(original)
  })

  it('rejects malformed and out-of-range patterns', () => {
    const generate = createSimilarQuestionGenerator()
    const input = pattern('addition', 3, 4, 7)
    expect(() => generate({ ...input, incorrectCount: 0 })).toThrow(RangeError)
    expect(() => generate(pattern('addition', 100, 100, 200, 1))).toThrow(
      RangeError,
    )
    expect(() => generate(pattern('division', 5, 0, 0))).toThrow(RangeError)
  })

  it('accepts review metadata only when a parent pattern ID is present', () => {
    const question = createSimilarQuestionGenerator()(
      pattern('addition', 3, 4, 7),
    )
    expect(isValidQuestion(question)).toBe(true)
    expect(isValidQuestion({ ...question, mistakePatternId: undefined })).toBe(
      false,
    )
    expect(isValidQuestion({ ...question, mistakePatternId: '' })).toBe(false)
  })
})
