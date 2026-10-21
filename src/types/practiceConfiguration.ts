import type { DifficultyLevel, MathOperation } from './question'

export type PracticeSessionLength = 5 | 10 | 20 | 'continuous'

export interface PracticeConfiguration {
  operations: MathOperation[]
  difficulty: DifficultyLevel
  sessionLength: PracticeSessionLength
}
