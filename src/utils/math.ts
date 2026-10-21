export type RandomSource = () => number

/** Inclusive integer bounds. Inject random in tests to reach exact boundaries. */
export function randomInteger(
  min: number,
  max: number,
  random: RandomSource = Math.random,
): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
    throw new RangeError('Expected ordered integer bounds.')
  }
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError(
      'Random source must return a number from 0 up to, but excluding, 1.',
    )
  }
  return min + Math.floor(value * (max - min + 1))
}
