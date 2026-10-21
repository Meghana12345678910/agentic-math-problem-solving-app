import { useRef, useState } from 'react'
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

function createSession(config: PracticeConfiguration): SessionState {
  return {
    session: {
      id: createId(),
      startedAt: new Date().toISOString(),
      operations: [...config.operations],
      difficulty: config.difficulty,
      sessionLength: config.sessionLength,
      attempted: 0,
      correct: 0,
      incorrect: 0,
    },
    question: generateQuestion(config.operations, config.difficulty),
    questionIndex: 0,
    active: true,
    attempts: [],
  }
}

export function usePracticeSession(config: PracticeConfiguration) {
  const [state, setState] = useState(() => createSession(config))
  // Synchronous state protects against duplicate events before React renders.
  const current = useRef(state)

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
      attemptedAt: new Date().toISOString(),
      sessionId: previous.session.id,
    }
    const attempted = previous.session.attempted + 1
    const active =
      config.sessionLength === 'continuous' || attempted < config.sessionLength
    const updated: SessionState = {
      session: {
        ...previous.session,
        attempted,
        ...(!active ? { completedAt: new Date().toISOString() } : {}),
        correct: previous.session.correct + (correct ? 1 : 0),
        incorrect: previous.session.incorrect + (correct ? 0 : 1),
      },
      question: active ? nextQuestion(config, question) : question,
      questionIndex: active
        ? previous.questionIndex + 1
        : previous.questionIndex,
      active,
      attempts: [...previous.attempts, attempt],
    }
    current.current = updated
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
    setState(updated)
  }

  return { ...state, recordResult, endSession }
}
