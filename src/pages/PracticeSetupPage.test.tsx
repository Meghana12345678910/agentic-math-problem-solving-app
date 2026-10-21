import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestRouter as MemoryRouter } from '../test/TestRouter'
import { describe, expect, it } from 'vitest'
import App from '../App'

function renderSetup() {
  render(
    <MemoryRouter initialEntries={['/practice/setup']}>
      <App />
    </MemoryRouter>,
  )
}

describe('Practice configuration', () => {
  it('defaults to 10 questions and explains required selections', () => {
    renderSetup()
    expect(screen.getByRole('radio', { name: '10 questions' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose at least one operation.',
    )
    expect(
      screen.getByRole('radio', { name: 'Level 1: Beginner' }),
    ).toBeChecked()
  })

  it('supports every operation independently, multiple choices, and deselection', async () => {
    const user = userEvent.setup()
    renderSetup()
    for (const name of [
      'Addition',
      'Subtraction',
      'Multiplication',
      'Division',
    ]) {
      await user.click(screen.getByRole('checkbox', { name }))
      expect(screen.getByRole('checkbox', { name })).toBeChecked()
    }
    await user.click(screen.getByRole('checkbox', { name: 'Subtraction' }))
    expect(
      screen.getByRole('checkbox', { name: 'Subtraction' }),
    ).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
  })

  it('selects all operations without duplicates when used repeatedly', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(
      screen.getByRole('button', { name: 'Select all operations' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Select all operations' }),
    )
    expect(
      screen
        .getAllByRole('checkbox')
        .every((input) => (input as HTMLInputElement).checked),
    ).toBe(true)
    await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    expect(
      screen.getByText('addition, subtraction, multiplication, division'),
    ).toBeInTheDocument()
  })

  it('selects only one difficulty and describes every level', async () => {
    const user = userEvent.setup()
    renderSetup()
    for (const name of [
      'Level 1: Beginner',
      'Level 2: Easy',
      'Level 3: Intermediate',
      'Level 4: Advanced',
    ]) {
      const radio = screen.getByRole('radio', { name })
      await user.click(radio)
      expect(radio).toBeChecked()
      expect(radio).toHaveAccessibleDescription()
      expect(
        within(screen.getByRole('group', { name: 'Difficulty' })).getAllByRole(
          'radio',
          { checked: true },
        ),
      ).toHaveLength(1)
    }
  })

  it.each([
    '5 questions',
    '10 questions',
    '20 questions',
    'Continuous practice',
  ])('selects and passes %s to the practice session', async (length) => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByRole('checkbox', { name: 'Multiplication' }))
    await user.click(screen.getByRole('checkbox', { name: 'Division' }))
    await user.click(
      screen.getByRole('radio', { name: 'Level 3: Intermediate' }),
    )
    await user.click(screen.getByRole('radio', { name: length }))
    expect(screen.getByRole('radio', { name: length })).toBeChecked()
    expect(
      within(
        screen.getByRole('group', { name: 'Session length' }),
      ).getAllByRole('radio', { checked: true }),
    ).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    expect(
      screen.getByRole('heading', { name: 'Practice session' }),
    ).toBeInTheDocument()
    expect(screen.getByText('multiplication, division')).toBeInTheDocument()
    expect(screen.getByText('3', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText(length, { selector: 'dd' })).toBeInTheDocument()
  })

  it('requires both operation and difficulty and disables again after deselection', async () => {
    const user = userEvent.setup()
    renderSetup()
    const start = screen.getByRole('button', { name: 'Start Session' })
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    expect(start).toBeEnabled()
    await user.click(screen.getByRole('radio', { name: 'Level 2: Easy' }))
    expect(start).toBeEnabled()
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    expect(start).toBeDisabled()
    await user.click(start)
    expect(
      screen.getByRole('heading', { name: 'Practice setup' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose at least one operation.',
    )
  })

  it('keeps Start Session disabled with difficulty alone', async () => {
    const user = userEvent.setup()
    renderSetup()
    await user.click(screen.getByRole('radio', { name: 'Level 1: Beginner' }))
    expect(screen.getByRole('button', { name: 'Start Session' })).toBeDisabled()
  })

  it('supports keyboard operation selection', async () => {
    const user = userEvent.setup()
    renderSetup()
    const addition = screen.getByRole('checkbox', { name: 'Addition' })
    addition.focus()
    await user.keyboard(' ')
    expect(addition).toBeChecked()
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Subtraction' })).toHaveFocus()
    await user.keyboard(' ')
    expect(screen.getByRole('checkbox', { name: 'Subtraction' })).toBeChecked()
  })
})
