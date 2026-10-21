import type { PracticeAttempt } from '../types/session'
import type { AppStatistics, OperationStatistics } from '../types/statistics'

export function calculateAccuracy(correct: number, attempted: number): number {
  return attempted === 0 ? 0 : Math.round((correct / attempted) * 100)
}
const emptyTotals = (): OperationStatistics => ({
  attempted: 0,
  correct: 0,
  incorrect: 0,
})

/** Attempts are the source of truth; correctness is the student's self-report. */
export function calculateStatistics(
  attempts: readonly PracticeAttempt[],
): AppStatistics {
  const statistics: AppStatistics = {
    ...emptyTotals(),
    byOperation: {
      addition: emptyTotals(),
      subtraction: emptyTotals(),
      multiplication: emptyTotals(),
      division: emptyTotals(),
    },
    byDifficulty: {
      1: emptyTotals(),
      2: emptyTotals(),
      3: emptyTotals(),
      4: emptyTotals(),
    },
  }
  for (const attempt of attempts) {
    for (const totals of [
      statistics,
      statistics.byOperation[attempt.operation],
      statistics.byDifficulty[attempt.difficulty],
    ]) {
      totals.attempted += 1
      if (attempt.selfReportedCorrect) totals.correct += 1
      else totals.incorrect += 1
    }
  }
  return statistics
}
