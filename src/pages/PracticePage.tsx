import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import { isPracticeConfiguration } from '../utils/practiceConfiguration'
import { usePracticeSession } from '../hooks/usePracticeSession'
import QuestionCard from '../components/practice/QuestionCard'
import ProgressBar from '../components/practice/ProgressBar'

function ActivePractice({
  configuration,
}: {
  configuration: PracticeConfiguration
}) {
  const {
    session,
    question,
    questionIndex,
    active,
    attempts,
    recordResult,
    endSession,
  } = usePracticeSession(configuration)
  const [confirmEnd, setConfirmEnd] = useState(false)

  if (!active)
    return (
      <Navigate
        to="/practice/summary"
        replace
        state={{
          summary: {
            session,
            mistakeReviewCount: attempts.filter(
              (attempt) => attempt.source === 'mistake-review',
            ).length,
          },
        }}
      />
    )

  return (
    <section>
      <h1>Practice session</h1>
      <dl className="session-configuration">
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
      <p role="status" aria-live="polite">
        Attempted: {session.attempted}. Correct: {session.correct}. Incorrect:{' '}
        {session.incorrect}.
      </p>
      {configuration.sessionLength !== 'continuous' && (
        <ProgressBar
          attempted={session.attempted}
          total={configuration.sessionLength}
        />
      )}
      {active && (
        <>
          <QuestionCard
            question={question}
            questionNumber={questionIndex + 1}
            totalQuestions={configuration.sessionLength}
            onResult={(correct, selectedAnswer) =>
              recordResult(question.id, selectedAnswer, correct)
            }
          />
          {configuration.sessionLength === 'continuous' && (
            <>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setConfirmEnd(true)}
              >
                End Session
              </button>
              {confirmEnd && (
                <div role="group" aria-label="Confirm ending session">
                  <p>End this practice session?</p>
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      endSession()
                      setConfirmEnd(false)
                    }}
                  >
                    Yes, end session
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setConfirmEnd(false)}
                  >
                    Keep practicing
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      <p>
        <Link to="/practice/card-preview">Try a sample card</Link>
      </p>
      <Link className="button button-secondary" to="/practice/setup">
        Change practice options
      </Link>
    </section>
  )
}

function PracticePage() {
  const location = useLocation()
  const state = location.state as { configuration?: unknown } | null
  if (!isPracticeConfiguration(state?.configuration)) {
    return <Navigate to="/practice/setup" replace />
  }
  return (
    <ActivePractice key={location.key} configuration={state.configuration} />
  )
}

export default PracticePage
