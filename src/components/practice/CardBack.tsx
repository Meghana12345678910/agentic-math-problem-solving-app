import { storageService } from '../../services/storageService'
import { explainQuestion } from '../../utils/explanation'
import { useEffect, useRef } from 'react'
import type { Question } from '../../types/question'

interface CardBackProps {
  question: Question
  selectedAnswer: number | null
  isCardFlipped: boolean
  result: boolean | null
  onResult: (correct: boolean) => void
}

function CardBack({
  question,
  selectedAnswer,
  isCardFlipped,
  result,
  onResult,
}: CardBackProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (isCardFlipped) heading.current?.focus()
  }, [isCardFlipped])

  return (
    <div
      className="card-face card-back"
      aria-hidden={!isCardFlipped}
      inert={!isCardFlipped}
    >
      <h2 ref={heading} tabIndex={-1}>
        Answer revealed
      </h2>
      <p className="math-problem">
        {question.displayText.replace('= ?', `= ${question.correctAnswer}`)}
      </p>
      <p>Correct answer: {question.correctAnswer}</p>
      <p>Your answer: {selectedAnswer}</p>
      {storageService.loadSettings().showExplanations && (
        <p>{explainQuestion(question)}</p>
      )}
      <div className="card-result-actions">
        <button
          type="button"
          className="button"
          disabled={!isCardFlipped || result !== null}
          onClick={() => onResult(true)}
        >
          I Got It Right
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={!isCardFlipped || result !== null}
          onClick={() => onResult(false)}
        >
          I Got It Wrong
        </button>
      </div>
    </div>
  )
}

export default CardBack
