import { useState } from 'react'
import type { MistakePattern } from '../../types/mistake'
import type { PracticeAttempt } from '../../types/session'
import { calculateMistakeStatistics } from '../../services/mistakeStatisticsService'

const symbols = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
}
const labels = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
}

function PatternList({
  patterns,
  threshold,
}: {
  patterns: MistakePattern[]
  threshold: number
}) {
  return (
    <ul className="statistics-grid mistake-list">
      {patterns.map((pattern) => (
        <li key={pattern.id} className="statistics-card mistake-pattern">
          <h4>
            {pattern.firstOperand} {symbols[pattern.operation]}{' '}
            {pattern.secondOperand} = {pattern.correctAnswer}
          </h4>
          <dl>
            <dt>Difficulty</dt>
            <dd>Level {pattern.difficulty}</dd>
            <dt>Incorrect count</dt>
            <dd>{pattern.incorrectCount}</dd>
            <dt>Mastery progress</dt>
            <dd>
              {pattern.similarCorrectCount} of {threshold} correct similar
              answers
              <progress
                aria-label={`Mastery for ${pattern.firstOperand} ${labels[pattern.operation].toLowerCase()} ${pattern.secondOperand}, level ${pattern.difficulty}`}
                value={Math.min(pattern.similarCorrectCount, threshold)}
                max={threshold}
              />
            </dd>
            <dt>Status</dt>
            <dd>{pattern.mastered ? 'Mastered' : 'Needs practice'}</dd>
            <dt>Last incorrect</dt>
            <dd>
              <time dateTime={pattern.lastIncorrectAt}>
                {new Date(pattern.lastIncorrectAt).toLocaleString()}
              </time>
            </dd>
          </dl>
        </li>
      ))}
    </ul>
  )
}

function MistakeStatistics({
  patterns,
  attempts,
  threshold,
}: {
  patterns: MistakePattern[]
  attempts: PracticeAttempt[]
  threshold: number
}) {
  const statistics = calculateMistakeStatistics(patterns, attempts)
  const [showMastered, setShowMastered] = useState(false)
  return (
    <section aria-labelledby="mistake-statistics-heading">
      <h2 id="mistake-statistics-heading">Mistake review statistics</h2>
      <dl className="statistics-card">
        <dt>Active mistake patterns</dt>
        <dd>{statistics.activePatterns.length}</dd>
        <dt>Mastered mistake patterns</dt>
        <dd>{statistics.masteredPatterns.length}</dd>
        <dt>Similar questions practiced</dt>
        <dd>{statistics.reviewAttempted}</dd>
        <dt>Review questions answered correctly</dt>
        <dd>{statistics.reviewCorrect}</dd>
      </dl>
      <p>
        Review totals use saved attempts. Pattern miss counts remain when
        practice statistics are reset.
      </p>
      {patterns.length === 0 ? (
        <p>No mistake patterns yet.</p>
      ) : (
        <>
          <h3>Most frequently missed operations</h3>
          <p>
            {statistics.mostMissedOperations
              .map((operation) => labels[operation])
              .join(', ')}{' '}
            — {statistics.mostMissedOperationCount} misses each
            {statistics.mostMissedOperations.length > 1 ? ' (tied)' : ''}.
          </p>
          <h3>Frequently missed number facts</h3>
          <ol className="frequent-facts">
            {statistics.frequentFacts.map((fact) => (
              <li
                key={`${fact.operation}:${fact.firstOperand}:${fact.secondOperand}`}
              >
                {fact.firstOperand} {symbols[fact.operation]}{' '}
                {fact.secondOperand}: {fact.incorrectCount} misses
              </li>
            ))}
          </ol>
          <p>
            Facts combine misses across difficulty levels. Equal counts share
            the same frequency.
          </p>
        </>
      )}
      <h3>Active mistake details</h3>
      {statistics.activePatterns.length ? (
        <PatternList
          patterns={statistics.activePatterns}
          threshold={threshold}
        />
      ) : (
        <p>No active mistake patterns.</p>
      )}
      <button
        type="button"
        className="button button-secondary"
        aria-expanded={showMastered}
        aria-controls="mastered-pattern-details"
        onClick={() => setShowMastered(!showMastered)}
      >
        Mastered patterns ({statistics.masteredPatterns.length})
      </button>
      <div id="mastered-pattern-details" hidden={!showMastered}>
        <summary>
          Mastered patterns ({statistics.masteredPatterns.length})
        </summary>
        {statistics.masteredPatterns.length ? (
          <PatternList
            patterns={statistics.masteredPatterns}
            threshold={threshold}
          />
        ) : (
          <p>No mastered patterns yet.</p>
        )}
      </div>
    </section>
  )
}
export default MistakeStatistics
