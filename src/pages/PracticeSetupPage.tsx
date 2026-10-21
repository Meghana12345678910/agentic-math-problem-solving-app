import ErrorMessage from '../components/common/ErrorMessage'
import { eligiblePatterns } from '../services/reviewService'
import { storageService } from '../services/storageService'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import OperationSelector from '../components/practice/OperationSelector'
import DifficultySelector from '../components/practice/DifficultySelector'
import SessionLengthSelector from '../components/practice/SessionLengthSelector'
import type { DifficultyLevel, MathOperation } from '../types/question'
import type {
  PracticeConfiguration,
  PracticeSessionLength,
} from '../types/practiceConfiguration'

function PracticeSetupPage() {
  const location = useLocation()
  const sessionError: unknown = location.state?.sessionError
  const [defaults] = useState(() => storageService.loadSettings())
  const [operations, setOperations] = useState<MathOperation[]>(
    defaults.defaultOperations,
  )
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(
    defaults.defaultDifficulty,
  )
  const [sessionLength, setSessionLength] = useState<PracticeSessionLength>(
    defaults.defaultSessionLength as PracticeSessionLength,
  )
  const [mode, setMode] = useState<'regular' | 'mistake-review'>('regular')
  const [patterns] = useState(() => storageService.loadMistakePatterns())
  const activeCount = eligiblePatterns(patterns, {
    operations,
    difficulty: difficulty ?? defaults.defaultDifficulty,
    sessionLength,
  }).length
  const navigate = useNavigate()
  const valid =
    operations.length > 0 &&
    difficulty !== null &&
    (mode === 'regular' || activeCount > 0)

  function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid || difficulty === null) return
    const configuration: PracticeConfiguration = {
      operations,
      mode,
      difficulty,
      sessionLength,
    }
    navigate('/practice/session', { state: { configuration } })
  }

  return (
    <section>
      <h1>Practice setup</h1>
      {typeof sessionError === 'string' && (
        <ErrorMessage title="Let's start a session" message={sessionError} />
      )}
      <p>Choose what you would like to practice.</p>
      <form className="practice-setup" onSubmit={startSession}>
        <OperationSelector selected={operations} onChange={setOperations} />
        <DifficultySelector selected={difficulty} onChange={setDifficulty} />
        <SessionLengthSelector
          selected={sessionLength}
          onChange={setSessionLength}
        />
        <fieldset>
          <legend>Practice mode</legend>
          <label className="selector-option">
            <input
              type="radio"
              name="practice-mode"
              checked={mode === 'regular'}
              onChange={() => setMode('regular')}
            />
            Regular practice
          </label>
          <label className="selector-option">
            <input
              type="radio"
              name="practice-mode"
              checked={mode === 'mistake-review'}
              disabled={activeCount === 0}
              aria-describedby="review-availability"
              onChange={() => setMode('mistake-review')}
            />
            Mistake review
          </label>
          <p id="review-availability">
            Active mistake patterns for these choices: {activeCount}.{' '}
            {activeCount === 0 &&
              'No active mistakes match your selected operations and difficulty.'}
          </p>
        </fieldset>
        <div id="setup-validation" role="status">
          {!operations.length && <p>Choose at least one operation.</p>}
          {difficulty === null && <p>Choose a difficulty level.</p>}
        </div>
        <button
          className="button"
          type="submit"
          disabled={!valid}
          aria-describedby="setup-validation"
        >
          Start Session
        </button>
      </form>
    </section>
  )
}

export default PracticeSetupPage
