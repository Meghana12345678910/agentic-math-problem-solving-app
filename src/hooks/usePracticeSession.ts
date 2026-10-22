import { withProgressLock } from '../services/progressLock'
import type { ActiveSessionSnapshot } from '../types/activeSession'
import { createReviewGenerator } from '../services/reviewService'
import { storageService } from '../services/storageService'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [initialReview] = useState(() =>
    createReviewGenerator(config, restored?.question),
  )
  const review = useRef(initialReview)
  const [initial] = useState(() =>
    restored
      ? { ...restored, active: true }
      : createSession(config, initialReview),
  )
  const [state, setState] = useState(initial)
  const [failure, setFailure] = useState<unknown>(null)
  // Route failures from event handlers and async locks through the page boundary.
  const runUpdate = useCallback((update: () => void) => {
    try {
      const pending = withProgressLock(update)
      if (pending) return pending.catch((error) => setFailure(() => error))
    } catch (error) {
      setFailure(() => error)
    }
  }, [])
  // Synchronous state protects against duplicate events before React renders.
  const current = useRef(state)
  const persist = useCallback(
    (snapshot: SessionState, previous?: SessionState) => {
      if (snapshot.session !== previous?.session)
        storageService.saveSession(snapshot.session)
      if (snapshot.active)
        storageService.saveActiveSession({ ...snapshot, configuration: config })
      else storageService.clearActiveSession(snapshot.session.id)
    },
    [config],
  )

  const synchronize = useCallback(() => {
    const previous = current.current
    const storedSession = storageService
      .loadSessions()
      .find((session) => session.id === previous.session.id)
    let latest: SessionState | undefined
    if (storedSession?.completedAt) {
      if (!previous.active) return
      latest = {
        ...previous,
        session: storedSession,
        active: false,
        attempts: storageService
          .loadAttempts()
          .filter((attempt) => attempt.sessionId === storedSession.id),
      }
    } else {
      const saved = storageService.loadActiveSession()
      if (
        previous.active &&
        saved?.session.id === previous.session.id &&
        saved.session.attempted >= previous.session.attempted &&
        (saved.session.attempted > previous.session.attempted ||
          saved.question.id !== previous.question.id)
      ) {
        latest = { ...saved, active: true }
        review.current = createReviewGenerator(config, saved.question)
      }
    }
    if (latest) {
      current.current = latest
      setState(latest)
    }
  }, [config])

  function updateSession(update: () => void) {
    return runUpdate(() => {
      synchronize()
      update()
    })
  }

  useEffect(() => {
    let mounted = true
    void runUpdate(() => {
      if (!mounted) return
      synchronize()
      persist(current.current)
    })
    return () => {
      mounted = false
    }
  }, [initial.session.id, synchronize, persist, runUpdate])

  if (failure) throw failure

  function updateCard(selectedAnswer: number | null, isCardFlipped: boolean) {
    const questionId = state.question.id
    return updateSession(() => {
      const previous = current.current
      if (
        !previous.active ||
        previous.question.id !== questionId ||
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
    })
  }

  function recordResult(
    questionId: string,
    selectedAnswer: number,
    correct: boolean,
  ) {
    return updateSession(() => {
      const previous = current.current
      if (
        !previous.active ||
        previous.question.id !== questionId ||
        !previous.isCardFlipped ||
        previous.selectedAnswer === null ||
        previous.selectedAnswer !== selectedAnswer ||
        typeof correct !== 'boolean' ||
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
        config.sessionLength === 'continuous' ||
        attempted < config.sessionLength
      const next = active
        ? config.mode === 'mistake-review'
          ? review.current()
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
    })
  }

  function endSession() {
    return updateSession(() => {
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
    })
  }

  return { ...state, recordResult, endSession, updateCard }
}
