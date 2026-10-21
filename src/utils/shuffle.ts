import { randomInteger } from './math.ts'
import type { RandomSource } from './math.ts'

/** Fisher–Yates shuffle; preserve the caller's array. */
export function shuffle<T>(
  items: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInteger(0, index, random)
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}
