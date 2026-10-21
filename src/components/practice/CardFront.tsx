import { describeQuestion } from '../../utils/questionText'
import { useEffect, useRef } from 'react'
import type { Question } from '../../types/question'
import AnswerChoice from './AnswerChoice'

interface CardFrontProps {
  question: Question
  selectedAnswer: number | null
  isCardFlipped: boolean
  onSelect: (answer: number) => void
  onFlip: () => void
}

function CardFront({
  question,
  selectedAnswer,
  isCardFlipped,
  onSelect,
  onFlip,
}: CardFrontProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  return (
    <div
      className="card-face card-front"
      aria-hidden={isCardFlipped}
      inert={isCardFlipped}
    >
      <h3
        ref={heading}
        tabIndex={-1}
        className="math-problem"
        aria-label={describeQuestion(question)}
      >
        {question.displayText}
      </h3>
      <div className="answer-grid" role="group" aria-label="Answer choices">
        {question.choices.map((answer, index) => (
          <AnswerChoice
            key={answer}
            answer={answer}
            shortcut={index + 1}
            selected={selectedAnswer === answer}
            disabled={isCardFlipped}
            onSelect={() => onSelect(answer)}
          />
        ))}
      </div>
      <button
        type="button"
        className="button"
        disabled={selectedAnswer === null || isCardFlipped}
        aria-expanded={isCardFlipped}
        onClick={onFlip}
      >
        Flip Card
      </button>
    </div>
  )
}

export default CardFront
