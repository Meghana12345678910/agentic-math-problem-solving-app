import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { SessionSummary } from '../types/sessionSummary'
import { isPracticeConfiguration } from '../utils/practiceConfiguration'

function SessionSummaryPage() {
  const location = useLocation()
  const summary = (location.state as { summary?: SessionSummary } | null)
    ?.summary
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])

  const session = summary?.session
  const valid =
    session &&
    isPracticeConfiguration(session) &&
    typeof session.completedAt === 'string' &&
    Number.isFinite(Date.parse(session.completedAt)) &&
    [
      session.attempted,
      session.correct,
      session.incorrect,
      summary.mistakeReviewCount,
    ].every((value) => Number.isInteger(value) && value >= 0) &&
    session.correct + session.incorrect === session.attempted &&
    summary.mistakeReviewCount <= session.attempted

  if (!valid) {
    return (
      <section>
        <h1 ref={heading} tabIndex={-1}>
          Session summary
        </h1>
        <p>No completed session is available yet.</p>
        <Link className="button" to="/practice/setup">
          Start Practice
        </Link>
        <Link className="button button-secondary" to="/">
          Return Home
        </Link>
      </section>
    )
  }

  const configuration = {
    operations: session.operations,
    difficulty: session.difficulty,
    sessionLength: session.sessionLength,
  }
  const accuracy =
    session.attempted === 0
      ? 0
      : Math.round((session.correct / session.attempted) * 100)
  const difficultyNames = {
    1: 'Beginner',
    2: 'Easy',
    3: 'Intermediate',
    4: 'Advanced',
  }

  return (
    <section>
      <h1 ref={heading} tabIndex={-1}>
        Session summary
      </h1>
      <p>Nice effort! Every question is a chance to learn.</p>
      <dl className="summary-totals">
        <dt>Questions attempted</dt>
        <dd>{session.attempted}</dd>
        <dt>Correct answers</dt>
        <dd>{session.correct}</dd>
        <dt>Incorrect answers</dt>
        <dd>{session.incorrect}</dd>
        <dt>Accuracy</dt>
        <dd>{accuracy}%</dd>
        <dt>Operations practiced</dt>
        <dd>{session.operations.join(', ')}</dd>
        <dt>Difficulty level</dt>
        <dd>
          Level {session.difficulty}: {difficultyNames[session.difficulty]}
        </dd>
        <dt>Mistake-review questions completed</dt>
        <dd>{summary.mistakeReviewCount}</dd>
        <dt>Completed</dt>
        <dd>
          <time dateTime={session.completedAt}>
            {new Date(session.completedAt!).toLocaleString()}
          </time>
        </dd>
      </dl>
      <div className="home-actions">
        <Link
          className="button"
          to="/practice/session"
          state={{ configuration }}
        >
          Practice Again
        </Link>
        <button
          className="button button-secondary"
          type="button"
          disabled
          aria-describedby="review-unavailable"
        >
          Practice Mistakes
        </button>
        <Link className="button button-secondary" to="/practice/setup">
          Change Settings
        </Link>
        <Link className="button button-secondary" to="/statistics">
          View Statistics
        </Link>
        <Link className="button button-secondary" to="/">
          Return Home
        </Link>
      </div>
      <p id="review-unavailable">Mistake review is not available yet.</p>
    </section>
  )
}

export default SessionSummaryPage
