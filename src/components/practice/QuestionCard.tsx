import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Question } from '../../types/question'
import CardFront from './CardFront'
import CardBack from './CardBack'
import './QuestionCard.css'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number | 'continuous'
  onResult?: (correct: boolean) => void
}

function CardContent({
  question,
  onResult,
}: Pick<QuestionCardProps, 'question' | 'onResult'>) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  const [result, setResult] = useState<boolean | null>(null)
  const resultSubmitted = useRef(false)

  function selectAnswer(answer: number) {
    if (!isCardFlipped) setSelectedAnswer(answer)
  }
  function reportResult(correct: boolean) {
    if (!isCardFlipped || resultSubmitted.current) return
    resultSubmitted.current = true
    setResult(correct)
    onResult?.(correct)
  }
  function selectByKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (
      target.closest('input, select, textarea, [contenteditable="true"]') ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      isCardFlipped
    )
      return
    const index = ['1', '2', '3', '4'].indexOf(event.key)
    if (index >= 0) {
      event.preventDefault()
      selectAnswer(question.choices[index])
    }
  }
  return (
    <div onKeyDown={selectByKeyboard}>
      <div
        className={`question-card-inner${isCardFlipped ? ' is-flipped' : ''}`}
      >
        <CardFront
          question={question}
          selectedAnswer={selectedAnswer}
          isCardFlipped={isCardFlipped}
          onSelect={selectAnswer}
          onFlip={() => {
            if (selectedAnswer !== null) setIsCardFlipped(true)
          }}
        />
        <CardBack
          question={question}
          selectedAnswer={selectedAnswer}
          isCardFlipped={isCardFlipped}
          result={result}
          onResult={reportResult}
        />
      </div>
      <p role="status" aria-live="polite">
        {result === null
          ? isCardFlipped
            ? `Correct answer: ${question.correctAnswer}. Your answer: ${selectedAnswer}.`
            : 'Choose an answer, then flip the card.'
          : result
            ? 'You marked this question as right. Nice work!'
            : 'You marked this question as wrong. Keep practicing!'}
      </p>
    </div>
  )
}

function QuestionCard(props: QuestionCardProps) {
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  return (
    <section
      className="question-card"
      aria-label="Math question card"
      data-animations={animationsEnabled}
    >
      <p>
        {props.totalQuestions === 'continuous'
          ? `Question ${props.questionNumber} · Continuous practice`
          : `Question ${props.questionNumber} of ${props.totalQuestions}`}
      </p>
      <label className="animation-setting">
        <input
          type="checkbox"
          checked={animationsEnabled}
          onChange={(event) => setAnimationsEnabled(event.target.checked)}
        />
        Animate card flip
      </label>
      {/* A different question ID resets selection, flip state, and the result lock. */}
      <CardContent
        key={props.question.id}
        question={props.question}
        onResult={props.onResult}
      />
    </section>
  )
}

export default QuestionCard
