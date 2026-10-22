import type { usePracticeSession } from '../hooks/usePracticeSession'

/** Hook tests follow the same select/reveal/report sequence as the card UI. */
export function reportResult(
  state: ReturnType<typeof usePracticeSession>,
  questionId: string,
  answer: number,
  correct: boolean,
) {
  const reveal = state.updateCard(answer, true)
  if (reveal instanceof Promise)
    return reveal.then(() => state.recordResult(questionId, answer, correct))
  return state.recordResult(questionId, answer, correct)
}
