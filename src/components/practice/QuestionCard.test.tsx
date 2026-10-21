import { renderReady as render } from '../../test/renderReady'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TestRouter as MemoryRouter } from '../../test/TestRouter'
import QuestionCard from './QuestionCard'
import type { Question } from '../../types/question'
import App from '../../App'

const question: Question = {
  id: 'first',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8 = ?',
  correctAnswer: 56,
  choices: [48, 54, 56, 64],
  difficulty: 2,
  source: 'regular',
}
async function card(onResult = vi.fn()) {
  return await render(
    <QuestionCard
      question={question}
      questionNumber={3}
      totalQuestions={10}
      onResult={onResult}
    />,
  )
}

describe('Phase 6 question card', () => {
  it('shows only the front with four choices, progress, and a disabled flip', async () => {
    await card()
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: '7 times 8 equals what?' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Answer / })).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
    expect(
      screen.queryByRole('heading', { name: 'Answer revealed' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'I Got It Right' }),
    ).not.toBeInTheDocument()
  })

  it('allows changing selection and never reports a result before self-assessment', async () => {
    const user = userEvent.setup()
    const result = vi.fn()
    await card(result)
    await user.click(screen.getByRole('button', { name: 'Answer 48' }))
    expect(screen.getByRole('button', { name: 'Answer 48' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Selected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Answer 56' }))
    expect(screen.getByRole('button', { name: 'Answer 48' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    expect(result).not.toHaveBeenCalled()
    expect(screen.getByText('7 × 8 = 56')).toBeInTheDocument()
    expect(screen.getByText('Your answer: 56')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Answer revealed' }),
    ).toHaveFocus()
    expect(
      screen.queryByRole('group', { name: 'Answer choices' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Correct answer: 56.')
  })

  it.each([true, false])(
    'reports the self-selected result %s exactly once',
    async (correct) => {
      const user = userEvent.setup()
      const result = vi.fn()
      await card(result)
      // A wrong selected number must not override self-reported correctness.
      await user.click(screen.getByRole('button', { name: 'Answer 48' }))
      await user.click(screen.getByRole('button', { name: 'Flip Card' }))
      const right = screen.getByRole('button', { name: 'I Got It Right' })
      const wrong = screen.getByRole('button', { name: 'I Got It Wrong' })
      await user.dblClick(correct ? right : wrong)
      await user.click(correct ? wrong : right)
      expect(result).toHaveBeenCalledExactlyOnceWith(correct, 48)
      expect(right).toBeDisabled()
      expect(wrong).toBeDisabled()
    },
  )

  it('locks selection after flipping, even for hidden controls', async () => {
    const user = userEvent.setup()
    await card()
    const oldAnswer = screen.getByRole('button', { name: 'Answer 48' })
    await user.click(screen.getByRole('button', { name: 'Answer 56' }))
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    fireEvent.click(oldAnswer)
    expect(screen.getByText('Your answer: 56')).toBeInTheDocument()
  })

  it('resets selection, flip state, and result lock for a new question ID', async () => {
    const user = userEvent.setup()
    const result = vi.fn()
    const view = await card(result)
    await user.click(screen.getByRole('button', { name: 'Answer 56' }))
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    view.rerender(
      <QuestionCard
        question={{ ...question, id: 'second' }}
        questionNumber={4}
        totalQuestions={10}
        onResult={result}
      />,
    )
    expect(screen.getByText('Question 4 of 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
    expect(
      screen
        .getAllByRole('button', { name: /^Answer / })
        .every((button) => button.getAttribute('aria-pressed') === 'false'),
    ).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Answer 54' }))
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.click(screen.getByRole('button', { name: 'I Got It Wrong' }))
    expect(result).toHaveBeenCalledTimes(2)
  })

  it('works with animation turned off and shows continuous question numbering', async () => {
    const user = userEvent.setup()
    await render(
      <QuestionCard
        question={question}
        questionNumber={8}
        totalQuestions="continuous"
      />,
    )
    expect(
      screen.getByText('Question 8 · Continuous practice'),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('checkbox', { name: 'Animate card flip' }),
    )
    expect(
      screen.getByRole('region', { name: 'Math question card' }),
    ).toHaveAttribute('data-animations', 'false')
    await user.click(screen.getByRole('button', { name: 'Answer 56' }))
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    expect(
      await screen.findByRole('heading', { name: 'Answer revealed' }),
    ).toBeInTheDocument()
  })

  it('supports number selection, Space, and Enter from the keyboard', async () => {
    const user = userEvent.setup()
    await card()
    screen.getByRole('button', { name: 'Answer 48' }).focus()
    await user.keyboard('3')
    expect(screen.getByRole('button', { name: 'Answer 56' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    screen.getByRole('button', { name: 'Answer 64' }).focus()
    await user.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Answer 64' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    screen.getByRole('button', { name: 'Flip Card' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Your answer: 64')).toBeInTheDocument()
    await user.keyboard('1')
    expect(screen.getByText('Your answer: 64')).toBeInTheDocument()
  })

  it('does not treat the animation checkbox as an answer shortcut', async () => {
    const user = userEvent.setup()
    await card()
    screen.getByRole('checkbox', { name: 'Animate card flip' }).focus()
    await user.keyboard('1')
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  })

  it('opens the sample card from the practice page without starting a session', async () => {
    const user = userEvent.setup()
    await render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/practice/session',
            state: {
              configuration: {
                operations: ['addition'],
                difficulty: 1,
                sessionLength: 5,
              },
            },
          },
        ]}
      >
        <App />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('link', { name: 'Try a sample card' }))
    await user.click(
      screen.getByRole('button', { name: 'End session and leave' }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Try a sample card' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  })
})
