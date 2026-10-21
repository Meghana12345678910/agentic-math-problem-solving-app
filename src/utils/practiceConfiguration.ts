import type { PracticeConfiguration } from '../types/practiceConfiguration'

export function isPracticeConfiguration(
  value: unknown,
): value is PracticeConfiguration {
  if (!value || typeof value !== 'object') return false
  const config = value as Partial<PracticeConfiguration>
  return (
    Array.isArray(config.operations) &&
    config.operations.length > 0 &&
    config.operations.every((operation) =>
      ['addition', 'subtraction', 'multiplication', 'division'].includes(
        operation,
      ),
    ) &&
    new Set(config.operations).size === config.operations.length &&
    [1, 2, 3, 4].includes(config.difficulty as number) &&
    [5, 10, 20, 'continuous'].includes(config.sessionLength as number | string)
  )
}
