import type { ActiveSessionSnapshot } from '../types/activeSession'
import SessionNavigationGuard from '../components/practice/SessionNavigationGuard'
import { storageService } from '../services/storageService'
import { eligiblePatterns } from '../services/reviewService'
import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import { isPracticeConfiguration } from '../utils/practiceConfiguration'
import { usePracticeSession } from '../hooks/usePracticeSession'
import QuestionCard from '../components/practice/QuestionCard'
import ProgressBar from '../components/practice/ProgressBar'

function ActivePractice({
  configuration,
  restored,
}: {
  restored?: ActiveSessionSnapshot | null
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
    selectedAnswer,
    isCardFlipped,
    updateCard,
  } = usePracticeSession(configuration, restored)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const [leaving, setLeaving] = useState(false)
  if (leaving) return null
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
      <SessionNavigationGuard
        active={active}
        onEnd={() => {
          setLeaving(true)
          endSession()
        }}
      />
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
            initialSelectedAnswer={selectedAnswer}
            initialFlipped={isCardFlipped}
            onCardChange={updateCard}
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
  const [saved] = useState(() => storageService.loadActiveSession())
  const explicit = isPracticeConfiguration(state?.configuration)
    ? state.configuration
    : null
  // A refresh may retain history state. Resume only a matching active snapshot;
  // an explicit new configuration must never silently become a different session.
  const matching =
    saved &&
    (!explicit ||
      (explicit.difficulty === saved.configuration.difficulty &&
        explicit.sessionLength === saved.configuration.sessionLength &&
        (explicit.mode ?? 'regular') ===
          (saved.configuration.mode ?? 'regular') &&
        [...explicit.operations].sort().join() ===
          [...saved.configuration.operations].sort().join()))
      ? saved
      : null
  const configuration = explicit ?? matching?.configuration
  if (!configuration)
    return (
      <Navigate
        to="/practice/setup"
        replace
        state={{
          sessionError:
            'We could not find a practice session to continue. Choose your practice options to start a new one.',
        }}
      />
    )
  if (
    !matching &&
    configuration.mode === 'mistake-review' &&
    !eligiblePatterns(storageService.loadMistakePatterns(), configuration)
      .length
  )
    return (
      <Navigate
        to="/practice/setup"
        replace
        state={{
          sessionError:
            'There are no active mistakes for these choices. Choose regular practice or different options.',
        }}
      />
    )
  return (
    <ActivePractice
      key={location.key}
      configuration={configuration}
      restored={matching}
    />
  )
}

export default PracticePage
