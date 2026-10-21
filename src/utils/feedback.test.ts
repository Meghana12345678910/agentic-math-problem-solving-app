import { describe, expect, it } from 'vitest'
import { getFeedbackMessage } from './feedback'

describe('child-friendly feedback selection', () => {
  it.each([true, false])(
    'varies messages for a self-reported result of %s',
    (correct) => {
      const messages = [0, 0.25, 0.5, 0.999999].map((value) =>
        getFeedbackMessage(correct, '', () => value),
      )
      expect(new Set(messages).size).toBe(4)
      expect(
        messages.every((message) => message.length > 0 && message.length < 80),
      ).toBe(true)
    },
  )
  it.each([true, false])(
    'avoids immediate repetition even with constant randomness for %s',
    (correct) => {
      const first = getFeedbackMessage(correct, '', () => 0)
      const next = getFeedbackMessage(correct, first, () => 0)
      expect(next).not.toBe(first)
    },
  )
})
