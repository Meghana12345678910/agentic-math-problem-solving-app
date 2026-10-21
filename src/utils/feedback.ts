import { randomInteger } from './math'
import type { RandomSource } from './math'

const positive = [
  'Nice work!',
  'Great effort!',
  'You are making progress!',
  'Keep up the practice!',
]
const supportive = [
  'Every try helps you learn.',
  'Take your time and try again.',
  'Keep practicing, one step at a time.',
  'You can give it another go.',
]

/** Pick once per result, avoiding an immediate repeat without timers or animation. */
export function getFeedbackMessage(
  correct: boolean,
  previous = '',
  random: RandomSource = Math.random,
): string {
  const choices = (correct ? positive : supportive).filter(
    (message) => message !== previous,
  )
  return choices[randomInteger(0, choices.length - 1, random)]
}
