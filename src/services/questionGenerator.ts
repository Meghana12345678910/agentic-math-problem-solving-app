import type {
  DifficultyLevel,
  MathOperation,
  Question,
} from '../types/question.ts'
import { randomInteger } from '../utils/math.ts'
import type { RandomSource } from '../utils/math.ts'
import { shuffle } from '../utils/shuffle.ts'
import { createId } from '../utils/ids.ts'

const operations: MathOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
]
const symbols: Record<MathOperation, string> = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}
const operandMaximum = { 1: 10, 2: 50, 3: 100, 4: 1000 }
const divisorMaximum = { 1: 5, 2: 10, 3: 12, 4: 99 }
const maximumAttempts = 3

export function calculateAnswer(
  operation: MathOperation,
  first: number,
  second: number,
): number {
  switch (operation) {
    case 'addition':
      return first + second
    case 'subtraction':
      return first - second
    case 'multiplication':
      return first * second
    case 'division':
      return first / second
  }
}

function generateOperands(
  operation: MathOperation,
  difficulty: DifficultyLevel,
  random: RandomSource,
): [number, number] {
  const integer = (min: number, max: number) => randomInteger(min, max, random)
  switch (operation) {
    case 'addition':
      return [
        integer(0, operandMaximum[difficulty]),
        integer(0, operandMaximum[difficulty]),
      ]
    case 'subtraction': {
      const first = integer(0, operandMaximum[difficulty])
      const second = integer(0, operandMaximum[difficulty])
      return [Math.max(first, second), Math.min(first, second)]
    }
    case 'multiplication':
      if (difficulty === 1) return [integer(0, 5), integer(0, 5)]
      if (difficulty === 2) return [integer(0, 10), integer(0, 10)]
      if (difficulty === 3) return [integer(0, 9), integer(0, 99)]
      return [integer(10, 99), integer(0, 99)]
    case 'division': {
      const divisor = integer(1, divisorMaximum[difficulty])
      const minQuotient = difficulty === 4 ? Math.ceil(100 / divisor) : 0
      const maxQuotient =
        difficulty === 1
          ? 5
          : difficulty === 2
            ? 10
            : Math.floor((difficulty === 3 ? 144 : 1000) / divisor)
      const quotient = integer(minQuotient, maxQuotient)
      return [divisor * quotient, divisor]
    }
  }
}

/** Nearby integer answers provide basic plausible choices without retry loops. */
function generateChoices(answer: number, random: RandomSource): number[] {
  const step = Math.max(1, Math.floor(answer * 0.05))
  const choices = new Set([answer])
  for (const offset of [-1, 1, -2, 2, 3]) {
    const candidate = answer + offset * step
    if (candidate >= 0) choices.add(candidate)
    if (choices.size === 4) break
  }
  return shuffle([...choices], random)
}

function operandsMatchDifficulty(question: Question): boolean {
  const {
    operation,
    difficulty,
    firstOperand: first,
    secondOperand: second,
  } = question
  if (operation === 'addition' || operation === 'subtraction') {
    return (
      first <= operandMaximum[difficulty] &&
      second <= operandMaximum[difficulty] &&
      (operation !== 'subtraction' || first >= second)
    )
  }
  if (operation === 'multiplication') {
    if (difficulty === 1) return first <= 5 && second <= 5
    if (difficulty === 2) return first <= 10 && second <= 10
    if (difficulty === 3) return first <= 9 && second <= 99
    return first >= 10 && first <= 99 && second <= 99
  }
  if (second < 1 || second > divisorMaximum[difficulty]) return false
  if (difficulty === 1) return question.correctAnswer <= 5
  if (difficulty === 2) return question.correctAnswer <= 10
  return (
    first <= (difficulty === 3 ? 144 : 1000) &&
    (difficulty !== 4 || first >= 100)
  )
}

export function isValidQuestion(question: Question): boolean {
  if (
    !operations.includes(question.operation) ||
    ![1, 2, 3, 4].includes(question.difficulty)
  )
    return false
  const numbers = [
    question.firstOperand,
    question.secondOperand,
    question.correctAnswer,
    ...question.choices,
  ]
  if (!numbers.every((value) => Number.isSafeInteger(value) && value >= 0))
    return false
  return (
    Boolean(question.id) &&
    question.source === 'regular' &&
    question.displayText ===
      `${question.firstOperand} ${symbols[question.operation]} ${question.secondOperand} = ?` &&
    operandsMatchDifficulty(question) &&
    calculateAnswer(
      question.operation,
      question.firstOperand,
      question.secondOperand,
    ) === question.correctAnswer &&
    question.choices.length === 4 &&
    new Set(question.choices).size === 4 &&
    question.choices.filter((choice) => choice === question.correctAnswer)
      .length === 1
  )
}

/** Accept a single operation or choose randomly from the enabled operations. */
export function generateQuestion(
  operation: MathOperation | readonly MathOperation[],
  difficulty: DifficultyLevel,
  random: RandomSource = Math.random,
): Question {
  const enabled = typeof operation === 'string' ? [operation] : operation
  if (
    !enabled.length ||
    !enabled.every((value) => operations.includes(value)) ||
    ![1, 2, 3, 4].includes(difficulty)
  ) {
    throw new RangeError(
      'Choose supported operations and a difficulty from 1 to 4.',
    )
  }
  let lastError: unknown
  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    try {
      const selected = enabled[randomInteger(0, enabled.length - 1, random)]
      const [first, second] = generateOperands(selected, difficulty, random)
      const answer = calculateAnswer(selected, first, second)
      const question: Question = {
        id: createId(),
        operation: selected,
        difficulty,
        firstOperand: first,
        secondOperand: second,
        displayText: `${first} ${symbols[selected]} ${second} = ?`,
        correctAnswer: answer,
        choices: generateChoices(answer, random),
        source: 'regular',
      }
      if (isValidQuestion(question)) return question
      lastError = new Error('Generated question did not pass validation.')
    } catch (error) {
      lastError = error
    }
  }
  throw new Error('Could not generate a valid question after 3 attempts.', {
    cause: lastError,
  })
}

export const generateAdditionQuestion = (
  difficulty: DifficultyLevel,
  random?: RandomSource,
) => generateQuestion('addition', difficulty, random)
export const generateSubtractionQuestion = (
  difficulty: DifficultyLevel,
  random?: RandomSource,
) => generateQuestion('subtraction', difficulty, random)
export const generateMultiplicationQuestion = (
  difficulty: DifficultyLevel,
  random?: RandomSource,
) => generateQuestion('multiplication', difficulty, random)
export const generateDivisionQuestion = (
  difficulty: DifficultyLevel,
  random?: RandomSource,
) => generateQuestion('division', difficulty, random)
