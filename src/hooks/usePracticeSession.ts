import type { ActiveSessionSnapshot } from '../types/activeSession'
import { createReviewGenerator } from '../services/reviewService'
import { storageService } from '../services/storageService'
import { useEffect, useRef, useState } from 'react'
import type { PracticeConfiguration } from '../types/practiceConfiguration'
import type { PracticeAttempt, PracticeSession } from '../types/session'
import type { Question } from '../types/question'
import { generateQuestion } from '../services/questionGenerator'
import { createId } from '../utils/ids'

interface SessionState {
  session: PracticeSession
  question: Question
  questionIndex: number
  active: boolean
  selectedAnswer: number | null
  isCardFlipped: boolean
  attempts: PracticeAttempt[]
}

function sameFact(first: Question, second: Question) {
  return (
    first.operation === second.operation &&
    first.firstOperand === second.firstOperand &&
    first.secondOperand === second.secondOperand
  )
}

/** Bounded random retries, then two distinct valid boundary facts as a fallback. */
export function nextQuestion(
  config: PracticeConfiguration,
  previous: Question,
): Question {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const question = generateQuestion(config.operations, config.difficulty)
    if (!sameFact(question, previous)) return question
  }
  const low = generateQuestion(previous.operation, config.difficulty, () => 0)
  return sameFact(low, previous)
    ? generateQuestion(previous.operation, config.difficulty, () => 0.999999)
    : low
}

function createSession(
  config: PracticeConfiguration,
  review: ReturnType<typeof createReviewGenerator>,
): SessionState {
  const question =
    config.mode === 'mistake-review'
      ? review()
      : generateQuestion(config.operations, config.difficulty)
  if (!question)
    throw new Error('No active mistakes match these practice choices.')
  return {
    session: {
      id: createId(),
      startedAt: new Date().toISOString(),
      operations: [...config.operations],
      mode: config.mode ?? 'regular',
      difficulty: config.difficulty,
      sessionLength: config.sessionLength,
      attempted: 0,
      correct: 0,
      incorrect: 0,
    },
    question,
    questionIndex: 0,
    active: true,
    attempts: [],
    selectedAnswer: null,
    isCardFlipped: false,
  }
}

export function usePracticeSession(
  configuration: PracticeConfiguration,
  restored?: ActiveSessionSnapshot | null,
) {
  const [config] = useState(() => configuration)
  const [review] = useState(() =>
    createReviewGenerator(config, restored?.question),
  )
  const [initial] = useState(() =>
    restored ? { ...restored, active: true } : createSession(config, review),
  )
  const [state, setState] = useState(initial)
  // Synchronous state protects against duplicate events before React renders.
  const current = useRef(state)
  function persist(snapshot: SessionState, previous?: SessionState) {
    if (snapshot.session !== previous?.session)
      storageService.saveSession(snapshot.session)
    if (snapshot.active)
      storageService.saveActiveSession({ ...snapshot, configuration: config })
    else storageService.clearActiveSession(snapshot.session.id)
  }
  useEffect(() => {
    storageService.saveSession(initial.session)
    if (initial.active)
      storageService.saveActiveSession({ ...initial, configuration: config })
    else storageService.clearActiveSession(initial.session.id)
  }, [initial, config])

  function updateCard(selectedAnswer: number | null, isCardFlipped: boolean) {
    const previous = current.current
    if (
      !previous.active ||
      (previous.selectedAnswer === selectedAnswer &&
        previous.isCardFlipped === isCardFlipped) ||
      previous.isCardFlipped ||
      (selectedAnswer !== null &&
        !previous.question.choices.includes(selectedAnswer)) ||
      (isCardFlipped && selectedAnswer === null)
    )
      return
    const updated = { ...previous, selectedAnswer, isCardFlipped }
    current.current = updated
    persist(updated, previous)
    setState(updated)
  }

  function recordResult(
    questionId: string,
    selectedAnswer: number,
    correct: boolean,
  ) {
    const previous = current.current
    if (
      !previous.active ||
      previous.question.id !== questionId ||
      !previous.question.choices.includes(selectedAnswer) ||
      previous.attempts.some((attempt) => attempt.questionId === questionId)
    )
      return
    const question = previous.question
    const attempt: PracticeAttempt = {
      id: createId(),
      questionId,
      operation: question.operation,
      firstOperand: question.firstOperand,
      secondOperand: question.secondOperand,
      correctAnswer: question.correctAnswer,
      selectedAnswer,
      selfReportedCorrect: correct,
      difficulty: question.difficulty,
      source: question.source,
      ...(question.mistakePatternId
        ? { mistakePatternId: question.mistakePatternId }
        : {}),
      attemptedAt: new Date().toISOString(),
      sessionId: previous.session.id,
    }
    storageService.saveAttempt(attempt)
    const attempted = previous.session.attempted + 1
    let active =
      config.sessionLength === 'continuous' || attempted < config.sessionLength
    const next = active
      ? config.mode === 'mistake-review'
        ? review()
        : nextQuestion(config, question)
      : question
    if (!next) active = false
    const updated: SessionState = {
      session: {
        ...previous.session,
        attempted,
        ...(!active ? { completedAt: new Date().toISOString() } : {}),
        correct: previous.session.correct + (correct ? 1 : 0),
        incorrect: previous.session.incorrect + (correct ? 0 : 1),
      },
      question: next ?? question,
      questionIndex: active
        ? previous.questionIndex + 1
        : previous.questionIndex,
      active,
      selectedAnswer: null,
      isCardFlipped: false,
      attempts: [...previous.attempts, attempt],
    }
    current.current = updated
    persist(updated, previous)
    setState(updated)
  }

  function endSession() {
    const previous = current.current
    if (!previous.active) return
    const updated = {
      ...previous,
      active: false,
      session: { ...previous.session, completedAt: new Date().toISOString() },
    }
    current.current = updated
    persist(updated, previous)
    setState(updated)
  }

  return { ...state, recordResult, endSession, updateCard }
}
