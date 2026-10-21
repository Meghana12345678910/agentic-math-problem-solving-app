import type { MistakePattern } from '../types/mistake'
import type { MathOperation, Question } from '../types/question'
import type { RandomSource } from '../utils/math'
import { randomInteger } from '../utils/math'
import {
  createQuestion,
  isValidFact,
  calculateAnswer,
} from './questionGenerator'
import { isMistakePattern } from './storageService'

export type SimilarityStrategy = 'nearby' | 'reversed' | 'fact-family'
type Fact = Pick<
  Question,
  | 'operation'
  | 'firstOperand'
  | 'secondOperand'
  | 'correctAnswer'
  | 'difficulty'
>
interface GenerationOptions {
  random?: RandomSource
  strategy?: SimilarityStrategy
}

const factKey = (fact: Fact) =>
  [fact.operation, fact.firstOperand, fact.secondOperand].join(':')
function candidates(
  pattern: MistakePattern,
): Record<SimilarityStrategy, Fact[]> {
  const {
    operation,
    firstOperand: first,
    secondOperand: second,
    correctAnswer: answer,
    difficulty,
  } = pattern
  const groups: Record<SimilarityStrategy, Fact[]> = {
    nearby: [],
    reversed: [],
    'fact-family': [],
  }
  const add = (
    strategy: SimilarityStrategy,
    operation: MathOperation,
    firstOperand: number,
    secondOperand: number,
  ) => {
    const fact = {
      operation,
      firstOperand,
      secondOperand,
      correctAnswer: calculateAnswer(operation, firstOperand, secondOperand),
      difficulty,
    }
    if (isValidFact(fact) && factKey(fact) !== factKey(pattern))
      groups[strategy].push(fact)
  }
  for (const offset of [-2, -1, 1, 2]) {
    if (operation === 'division') {
      // Move within nearby whole-number facts rather than perturbing a dividend
      // into a fractional division question.
      add('nearby', operation, second * (answer + offset), second)
      add('nearby', operation, (second + offset) * answer, second + offset)
    } else {
      add('nearby', operation, first + offset, second)
      add('nearby', operation, first, second + offset)
    }
  }
  if (operation === 'addition' || operation === 'multiplication')
    add('reversed', operation, second, first)
  switch (operation) {
    case 'addition':
      add('fact-family', 'subtraction', answer, first)
      add('fact-family', 'subtraction', answer, second)
      break
    case 'subtraction':
      add('fact-family', 'addition', answer, second)
      add('fact-family', 'addition', second, answer)
      break
    case 'multiplication':
      if (first !== 0) add('fact-family', 'division', answer, first)
      if (second !== 0) add('fact-family', 'division', answer, second)
      break
    case 'division':
      add('fact-family', 'multiplication', second, answer)
      add('fact-family', 'multiplication', answer, second)
      break
  }
  for (const strategy of Object.keys(groups) as SimilarityStrategy[]) {
    groups[strategy] = [
      ...new Map(
        groups[strategy].map((fact) => [factKey(fact), fact]),
      ).values(),
    ]
  }
  return groups
}

/** Keep bounded, in-memory repeat history; no review sessions or mastery updates. */
export function createSimilarQuestionGenerator() {
  const lastFacts = new Map<string, string>()
  return function generate(
    pattern: MistakePattern,
    options: GenerationOptions = {},
  ): Question {
    if (!isMistakePattern(pattern) || !isValidFact(pattern))
      throw new RangeError(
        'A valid mistake pattern within its difficulty is required.',
      )
    const random = options.random ?? Math.random
    const groups = candidates(pattern)
    const previous = lastFacts.get(pattern.id)
    // If a small candidate pool has no alternative, relax only the last-fact
    // exclusion. The original missed fact is always excluded.
    const withoutRepeats = Object.fromEntries(
      Object.entries(groups).map(([strategy, facts]) => [
        strategy,
        facts.filter((fact) => factKey(fact) !== previous),
      ]),
    ) as Record<SimilarityStrategy, Fact[]>
    const availableGroups = Object.values(withoutRepeats).some(
      (facts) => facts.length,
    )
      ? withoutRepeats
      : groups
    const strategies = (
      Object.keys(availableGroups) as SimilarityStrategy[]
    ).filter((strategy) => availableGroups[strategy].length)
    if (!strategies.length)
      throw new Error(
        'No valid similar question is available for this pattern.',
      )
    const strategy =
      options.strategy && strategies.includes(options.strategy)
        ? options.strategy
        : strategies[randomInteger(0, strategies.length - 1, random)]
    const facts = availableGroups[strategy]
    const fact = facts[randomInteger(0, facts.length - 1, random)]
    const question = createQuestion(
      fact.operation,
      fact.difficulty,
      fact.firstOperand,
      fact.secondOperand,
      random,
    )
    lastFacts.delete(pattern.id)
    lastFacts.set(pattern.id, factKey(fact))
    if (lastFacts.size > 100) lastFacts.delete(lastFacts.keys().next().value!)
    return {
      ...question,
      source: 'mistake-review',
      mistakePatternId: pattern.id,
    }
  }
}
export const generateSimilarQuestion = createSimilarQuestionGenerator()
