import { getFeedbackMessage } from '../../utils/feedback'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { describeQuestion } from '../../utils/questionText'
import { playFeedbackSound } from '../../utils/sound'
import { storageService } from '../../services/storageService'
import { useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Question } from '../../types/question'
import CardFront from './CardFront'
import CardBack from './CardBack'
import './QuestionCard.css'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number | 'continuous'
  onResult?: (correct: boolean, selectedAnswer: number) => void
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
    const preferences = storageService.loadSettings()
    if (
      preferences.soundEnabled &&
      preferences.feedbackEffectsEnabled !== false
    )
      playFeedbackSound(correct)
    setResult(correct)
    if (selectedAnswer !== null) onResult?.(correct, selectedAnswer)
  }
  function selectByKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (
      target.closest(
        'input, select, textarea, [role="textbox"], [contenteditable]:not([contenteditable="false"])',
      ) ||
      event.nativeEvent.isComposing ||
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
            ? 'You marked this question as right.'
            : 'You marked this question as wrong.'}
      </p>
    </div>
  )
}

function QuestionCard(props: QuestionCardProps) {
  const reducedMotion = useReducedMotion()
  const motionNoteId = useId()
  const [feedback, setFeedback] = useState('')
  const [animationsEnabled, setAnimationsEnabled] = useState(
    () => storageService.loadSettings().animationsEnabled,
  )
  return (
    <section
      className="question-card"
      aria-label="Math question card"
      data-animations={animationsEnabled && !reducedMotion}
    >
      <p aria-live="polite" aria-atomic="true">
        {props.totalQuestions === 'continuous'
          ? `Question ${props.questionNumber} · Continuous practice`
          : `Question ${props.questionNumber} of ${props.totalQuestions}`}
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {describeQuestion(props.question)}
      </p>
      <label className="animation-setting">
        <input
          type="checkbox"
          checked={animationsEnabled}
          aria-describedby={reducedMotion ? motionNoteId : undefined}
          onChange={(event) => {
            setAnimationsEnabled(event.target.checked)
            storageService.saveSettings({
              ...storageService.loadSettings(),
              animationsEnabled: event.target.checked,
            })
          }}
        />
        Animate card flip
      </label>
      {reducedMotion && (
        <p id={motionNoteId}>
          Card animation is off because your device requests reduced motion.
        </p>
      )}
      {/* A different question ID resets selection, flip state, and the result lock. */}
      <CardContent
        key={props.question.id}
        question={props.question}
        onResult={(correct, selectedAnswer) => {
          setFeedback(
            storageService.loadSettings().feedbackEffectsEnabled === false
              ? ''
              : getFeedbackMessage(correct, feedback),
          )
          props.onResult?.(correct, selectedAnswer)
        }}
      />
      <p className="feedback-message" aria-live="polite" aria-atomic="true">
        {feedback}
      </p>
    </section>
  )
}

export default QuestionCard
