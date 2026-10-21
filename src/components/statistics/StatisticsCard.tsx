import type { OperationStatistics } from '../../types/statistics'
import { calculateAccuracy } from '../../services/statisticsService'

function StatisticsCard({
  title,
  totals,
}: {
  title: string
  totals: OperationStatistics
}) {
  return (
    <section className="statistics-card" aria-label={title}>
      <h3>{title}</h3>
      <dl>
        <dt>Attempted</dt>
        <dd>{totals.attempted}</dd>
        <dt>Correct</dt>
        <dd>{totals.correct}</dd>
        <dt>Incorrect</dt>
        <dd>{totals.incorrect}</dd>
        <dt>Accuracy</dt>
        <dd>{calculateAccuracy(totals.correct, totals.attempted)}%</dd>
      </dl>
    </section>
  )
}
export default StatisticsCard
