import type { PracticeSession } from '../../types/session'
import { calculateAccuracy } from '../../services/statisticsService'

function RecentSessions({ sessions }: { sessions: PracticeSession[] }) {
  const recent = [...sessions].sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
  )
  return (
    <section aria-labelledby="recent-sessions-heading">
      <h2 id="recent-sessions-heading">Recent sessions</h2>
      {!recent.length ? (
        <p>No practice sessions yet.</p>
      ) : (
        <ol className="statistics-grid recent-sessions">
          {recent.map((session) => (
            <li className="statistics-card" key={session.id}>
              <h3>
                <time dateTime={session.startedAt}>
                  {new Date(session.startedAt).toLocaleString()}
                </time>
              </h3>
              <p>{session.completedAt ? 'Completed' : 'Not completed'}</p>
              <dl>
                <dt>Operations</dt>
                <dd>{session.operations.join(', ')}</dd>
                <dt>Difficulty</dt>
                <dd>Level {session.difficulty}</dd>
                <dt>Attempted</dt>
                <dd>{session.attempted}</dd>
                <dt>Correct</dt>
                <dd>{session.correct}</dd>
                <dt>Incorrect</dt>
                <dd>{session.incorrect}</dd>
                <dt>Accuracy</dt>
                <dd>
                  {calculateAccuracy(session.correct, session.attempted)}%
                </dd>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
export default RecentSessions
