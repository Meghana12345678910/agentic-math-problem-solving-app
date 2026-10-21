import type { PracticeConfiguration } from './practiceConfiguration'
import type { PracticeAttempt, PracticeSession } from './session'
import type { Question } from './question'

export interface ActiveSessionSnapshot {
  configuration: PracticeConfiguration
  session: PracticeSession
  question: Question
  questionIndex: number
  attempts: PracticeAttempt[]
  selectedAnswer: number | null
  isCardFlipped: boolean
}
