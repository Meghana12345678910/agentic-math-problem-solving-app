import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import App from '../App'

it('restores the animation preference after unmounting and reopening the card', async () => {
  const user = userEvent.setup()
  const mount = () =>
    render(
      <MemoryRouter initialEntries={['/practice/card-preview']}>
        <App />
      </MemoryRouter>,
    )
  const view = mount()
  await user.click(screen.getByRole('checkbox', { name: 'Animate card flip' }))
  expect(
    JSON.parse(localStorage.getItem('mathPractice.settings')!)
      .animationsEnabled,
  ).toBe(false)
  view.unmount()
  mount()
  expect(
    screen.getByRole('checkbox', { name: 'Animate card flip' }),
  ).not.toBeChecked()
})

it('warns when storage is full while allowing an answer to advance practice', async () => {
  const user = userEvent.setup()
  const failure = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
  try {
    render(
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
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'keep practicing',
    )
    await user.click(screen.getAllByRole('button', { name: /^Answer / })[0])
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
    expect(screen.getByText('Question 2 of 5')).toBeInTheDocument()
    expect(
      screen.getByText('Attempted: 1. Correct: 1. Incorrect: 0.'),
    ).toBeInTheDocument()
  } finally {
    failure.mockRestore()
  }
})
