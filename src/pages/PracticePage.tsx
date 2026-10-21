import { Link, useLocation } from 'react-router-dom'
import type { PracticeConfiguration } from '../types/practiceConfiguration'

function PracticePage() {
  const location = useLocation()
  const configuration = (
    location.state as { configuration?: PracticeConfiguration } | null
  )?.configuration

  return (
    <section>
      <h1>Practice session</h1>
      {configuration ? (
        <>
          <p>Your practice choices are ready.</p>
          <dl>
            <dt>Operations</dt>
            <dd>{configuration.operations.join(', ')}</dd>
            <dt>Difficulty level</dt>
            <dd>{configuration.difficulty}</dd>
            <dt>Session length</dt>
            <dd>
              {configuration.sessionLength === 'continuous'
                ? 'Continuous practice'
                : `${configuration.sessionLength} questions`}
            </dd>
          </dl>
          <p>Practice questions are coming soon.</p>
        </>
      ) : (
        <p>Choose your practice options to get ready.</p>
      )}
      <Link className="button button-secondary" to="/practice/setup">
        Change practice options
      </Link>
    </section>
  )
}

export default PracticePage
