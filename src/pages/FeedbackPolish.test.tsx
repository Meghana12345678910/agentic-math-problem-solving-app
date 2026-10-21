import { renderReady as render } from '../test/renderReady'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestRouter as MemoryRouter } from '../test/TestRouter'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import QuestionCard from '../components/practice/QuestionCard'
import {
  storageService,
  defaultSettings,
  createStorageService,
  isSettings,
} from '../services/storageService'
import { playFeedbackSound } from '../utils/sound'
import type { Question } from '../types/question'

vi.mock('../utils/sound', () => ({ playFeedbackSound: vi.fn() }))
const question: Question = {
  id: 'feedback-1',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8 = ?',
  correctAnswer: 56,
  choices: [48, 54, 56, 64],
  difficulty: 2,
  source: 'regular',
}
async function card() {
  return await render(
    <QuestionCard question={question} questionNumber={1} totalQuestions={5} />,
  )
}
async function report(correct: boolean) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Answer 56' }))
  await user.click(screen.getByRole('button', { name: 'Flip Card' }))
  await user.click(
    screen.getByRole('button', {
      name: correct ? 'I Got It Right' : 'I Got It Wrong',
    }),
  )
}

describe('Phase 17 feedback polish', () => {
  it.each([true, false])(
    'shows brief encouragement after a self-reported result of %s',
    async (correct) => {
      const view = await card()
      expect(document.querySelector('.feedback-message')).toBeEmptyDOMElement()
      await report(correct)
      const message = document.querySelector('.feedback-message')!
      expect(message.textContent!.length).toBeGreaterThan(0)
      expect(message).toHaveAttribute('aria-live', 'polite')
      expect(screen.getByRole('status')).toHaveTextContent(
        correct
          ? 'You marked this question as right.'
          : 'You marked this question as wrong.',
      )
      const text = message.textContent
      view.rerender(
        <QuestionCard
          question={{ ...question, id: 'feedback-2' }}
          questionNumber={2}
          totalQuestions={5}
        />,
      )
      expect(document.querySelector('.feedback-message')).toHaveTextContent(
        text!,
      )
      expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
    },
  )
  it('suppresses optional messages and sounds while preserving the core result text', async () => {
    vi.mocked(playFeedbackSound).mockClear()
    storageService.saveSettings({
      ...defaultSettings,
      soundEnabled: true,
      feedbackEffectsEnabled: false,
    })
    await card()
    await report(true)
    expect(document.querySelector('.feedback-message')).toBeEmptyDOMElement()
    expect(playFeedbackSound).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'You marked this question as right.',
    )
  })
  it('saves and restores the option from Settings', async () => {
    const user = userEvent.setup()
    const mount = async () =>
      await render(
        <MemoryRouter initialEntries={['/settings']}>
          <App />
        </MemoryRouter>,
      )
    const view = await mount()
    expect(
      screen.getByRole('checkbox', { name: 'Encouraging feedback effects' }),
    ).toBeChecked()
    await user.click(
      screen.getByRole('checkbox', { name: 'Encouraging feedback effects' }),
    )
    await user.click(screen.getByRole('button', { name: 'Save Settings' }))
    expect(createStorageService().loadSettings().feedbackEffectsEnabled).toBe(
      false,
    )
    view.unmount()
    await mount()
    expect(
      screen.getByRole('checkbox', { name: 'Encouraging feedback effects' }),
    ).not.toBeChecked()
  })
  it('keeps legacy settings valid and enables feedback by default', async () => {
    const legacy = { ...defaultSettings }
    delete legacy.feedbackEffectsEnabled
    localStorage.setItem('mathPractice.settings', JSON.stringify(legacy))
    expect(isSettings(legacy)).toBe(true)
    expect(isSettings({ ...legacy, feedbackEffectsEnabled: 'invalid' })).toBe(
      false,
    )
    await card()
    await report(false)
    expect(
      document.querySelector('.feedback-message'),
    ).not.toBeEmptyDOMElement()
  })
})
