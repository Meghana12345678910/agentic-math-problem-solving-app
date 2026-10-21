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
  const operationWords = {
    addition: 'plus',
    subtraction: 'minus',
    multiplication: 'times',
    division: 'divided by',
  }
  return (
    <div
      className="card-face card-front"
      aria-hidden={isCardFlipped}
      inert={isCardFlipped}
    >
      <h3
        className="math-problem"
        aria-label={`${question.firstOperand} ${operationWords[question.operation]} ${question.secondOperand} equals what?`}
      >
        {question.displayText}
      </h3>
      <div className="answer-grid" role="group" aria-label="Answer choices">
        {question.choices.map((answer) => (
          <AnswerChoice
            key={answer}
            answer={answer}
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
