import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import OperationSelector from '../components/practice/OperationSelector'
import DifficultySelector from '../components/practice/DifficultySelector'
import SessionLengthSelector from '../components/practice/SessionLengthSelector'
import type { DifficultyLevel, MathOperation } from '../types/question'
import type {
  PracticeConfiguration,
  PracticeSessionLength,
} from '../types/practiceConfiguration'

function PracticeSetupPage() {
  const [operations, setOperations] = useState<MathOperation[]>([])
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null)
  const [sessionLength, setSessionLength] = useState<PracticeSessionLength>(10)
  const navigate = useNavigate()
  const valid = operations.length > 0 && difficulty !== null

  function startSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!operations.length || difficulty === null) return
    const configuration: PracticeConfiguration = {
      operations,
      difficulty,
      sessionLength,
    }
    navigate('/practice/session', { state: { configuration } })
  }

  return (
    <section>
      <h1>Practice setup</h1>
      <p>Choose what you would like to practice.</p>
      <form className="practice-setup" onSubmit={startSession}>
        <OperationSelector selected={operations} onChange={setOperations} />
        <DifficultySelector selected={difficulty} onChange={setDifficulty} />
        <SessionLengthSelector
          selected={sessionLength}
          onChange={setSessionLength}
        />
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
