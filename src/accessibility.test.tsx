/// <reference types="node" />
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestRouter as MemoryRouter } from './test/TestRouter'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

import App from './App'
import QuestionCard from './components/practice/QuestionCard'
import ProgressBar from './components/practice/ProgressBar'
import type { Question } from './types/question'
import { storageService } from './services/storageService'

const question: Question = {
  id: 'accessibility',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  correctAnswer: 56,
  displayText: '7 × 8 = ?',
  choices: [48, 54, 56, 64],
  difficulty: 2,
  source: 'regular',
}
const card = () =>
  render(
    <QuestionCard question={question} questionNumber={1} totalQuestions={5} />,
  )
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Phase 16 keyboard and announcements', () => {
  it.each([1, 2, 3, 4])(
    'selects answer %s using its advertised number shortcut',
    async (key) => {
      const user = userEvent.setup()
      card()
      await user.keyboard(key.toString())
      const button = screen.getByRole('button', {
        name: 'Answer ' + question.choices[key - 1],
      })
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(button).toHaveAttribute('aria-keyshortcuts', key.toString())
      expect(screen.getByText('Selected')).toBeInTheDocument()
    },
  )
  it.each(['input', 'textarea', 'select', 'editable', 'textbox'])(
    'leaves numeric typing in %s alone',
    (kind) => {
      card()
      const target = document.createElement(
        ['editable', 'textbox'].includes(kind) ? 'div' : kind,
      )
      if (kind === 'editable') target.setAttribute('contenteditable', '')
      if (kind === 'textbox') target.setAttribute('role', 'textbox')
      document.querySelector('.question-card-inner')!.append(target)
      expect(fireEvent.keyDown(target, { key: '3' })).toBe(true)
      expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
    },
  )
  it.each([
    { ctrlKey: true },
    { altKey: true },
    { metaKey: true },
    { isComposing: true },
  ])('ignores modified/composing shortcuts %j', (flags) => {
    card()
    fireEvent.keyDown(
      screen.getByRole('heading', { name: '7 times 8 equals what?' }),
      { key: '1', ...flags },
    )
    expect(screen.getByRole('button', { name: 'Flip Card' })).toBeDisabled()
  })
  it('announces changed questions and progress without exposing both faces', async () => {
    const user = userEvent.setup()
    const view = card()
    expect(screen.getByText('Question 1 of 5')).toHaveAttribute(
      'aria-live',
      'polite',
    )
    expect(
      screen.getByText('7 times 8 equals what?', { selector: 'p' }),
    ).toHaveAttribute('aria-live', 'polite')
    await user.keyboard('3')
    screen.getByRole('button', { name: 'Flip Card' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Correct answer: 56. Your answer: 56.',
    )
    expect(
      screen.getByRole('heading', { name: 'Answer revealed' }),
    ).toHaveFocus()
    expect(document.querySelector('.card-front')).toHaveAttribute('inert')
    expect(
      screen.queryByRole('group', { name: 'Answer choices' }),
    ).not.toBeInTheDocument()
    view.rerender(
      <QuestionCard
        question={{
          ...question,
          id: 'next',
          firstOperand: 8,
          secondOperand: 7,
          displayText: '8 × 7 = ?',
        }}
        questionNumber={2}
        totalQuestions={5}
      />,
    )
    expect(screen.getByText('Question 2 of 5')).toHaveAttribute(
      'aria-atomic',
      'true',
    )
    expect(
      screen.getByRole('heading', { name: '8 times 7 equals what?' }),
    ).toHaveFocus()
  })
  it('announces progress totals accessibly', () => {
    const view = render(<ProgressBar attempted={1} total={5} />)
    expect(
      screen.getByText('Session progress: 1 of 5 completed'),
    ).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '1 of 5 questions completed',
    )
    view.rerender(<ProgressBar attempted={2} total={5} />)
    expect(screen.getByRole('progressbar')).toHaveAccessibleName(
      'Session progress: 2 of 5 completed',
    )
  })
  it('moves focus on navigation and keeps preference controls usable with the keyboard', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await user.tab()
    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toHaveFocus()
    await user.click(
      screen.getByRole('navigation').querySelector('a[href="/settings"]')!,
    )
    expect(screen.getByRole('heading', { name: 'Settings' })).toHaveFocus()
    await user.tab()
    const sound = screen.getByRole('checkbox', { name: 'Sound effects' })
    expect(sound).toHaveFocus()
    await user.keyboard(' ')
    expect(sound).toBeChecked()
  })
  it.each([
    '/',
    '/practice/setup',
    '/settings',
    '/statistics',
    '/practice/card-preview',
  ])('gives visible controls accessible names on %s', (path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    )
    for (const control of [
      ...screen.queryAllByRole('button'),
      ...screen.queryAllByRole('link'),
      ...screen.queryAllByRole('checkbox'),
      ...screen.queryAllByRole('radio'),
      ...screen.queryAllByRole('spinbutton'),
    ]) {
      expect(control).toHaveAccessibleName()
    }
  })
})

describe('Phase 16 reduced motion', () => {
  it('responds to system preference changes while preserving the saved choice', async () => {
    let matches = true
    const listeners = new Set<() => void>()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return matches
        },
        addEventListener: (_event: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener: (_event: string, listener: () => void) =>
          listeners.delete(listener),
      })),
    )
    const user = userEvent.setup()
    card()
    const region = screen.getByRole('region', { name: 'Math question card' })
    expect(region).toHaveAttribute('data-animations', 'false')
    expect(
      screen.getByRole('checkbox', { name: 'Animate card flip' }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Animate card flip' }),
    ).toHaveAccessibleDescription(/device requests reduced motion/)
    await user.keyboard('3')
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    expect(
      screen.getByRole('heading', { name: 'Answer revealed' }),
    ).toBeInTheDocument()
    act(() => {
      matches = false
      listeners.forEach((listener) => listener())
    })
    expect(region).toHaveAttribute('data-animations', 'true')
    expect(storageService.loadSettings().animationsEnabled).toBe(true)
    await user.click(
      screen.getByRole('checkbox', { name: 'Animate card flip' }),
    )
    expect(region).toHaveAttribute('data-animations', 'false')
    act(() => {
      matches = true
      listeners.forEach((listener) => listener())
    })
    act(() => {
      matches = false
      listeners.forEach((listener) => listener())
    })
    expect(region).toHaveAttribute('data-animations', 'false')
  })
})

// Read the real palette rather than maintaining a separate copy of the colors.
const baseCss = readFileSync('src/index.css', 'utf8')
const appCss = readFileSync('src/App.css', 'utf8')
const cardCss = readFileSync('src/components/practice/QuestionCard.css', 'utf8')
function rule(css: string, selector: string) {
  const start = css.indexOf(selector + ' {')
  if (start < 0) throw new Error('Missing CSS selector ' + selector)
  return css.slice(start, css.indexOf('}', start))
}
function color(cssRule: string, property: string) {
  const match = cssRule.match(
    new RegExp(
      '(?:^|[;\\n])\\s*' +
        property +
        ':\\s*[^;]*?(#[a-fA-F0-9]{3,6})(?:[;\\s])',
    ),
  )
  if (!match) throw new Error('Missing color ' + property)
  return match[1]
}
function luminance(hex: string) {
  const digits = hex.slice(1)
  const full =
    digits.length === 3
      ? [...digits].map((value) => value + value).join('')
      : digits
  const channels = [0, 2, 4]
    .map((index) => parseInt(full.slice(index, index + 2), 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}
function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

describe('Phase 16 visual accessibility', () => {
  it('keeps normal, secondary, selected, and hover text above 4.5:1', () => {
    const root = rule(baseCss, ':root')
    const button = rule(appCss, '.button')
    const secondary = rule(appCss, '.button-secondary')
    const link = color(rule(baseCss, 'a'), 'color')
    const pairs = [
      [color(root, 'color'), color(root, 'background')],
      [color(button, 'color'), color(button, 'background')],
      [color(secondary, 'color'), color(secondary, 'background')],
      [
        color(button, 'color'),
        color(rule(appCss, '.button:hover'), 'background'),
      ],
      [link, color(rule(appCss, 'nav a:hover'), 'background')],
      [
        link,
        color(
          rule(cardCss, ".answer-choice[aria-pressed='true']"),
          'background',
        ),
      ],
      [
        color(rule(appCss, '.eyebrow'), 'color'),
        color(rule(appCss, '.welcome-panel'), 'background'),
      ],
    ]
    for (const [foreground, background] of pairs)
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })
  it('provides a global visible focus indicator with at least 3:1 contrast', () => {
    const focus = color(rule(baseCss, ':focus-visible'), 'outline')
    expect(contrast(focus, '#fff')).toBeGreaterThanOrEqual(3)
    expect(
      contrast(focus, color(rule(baseCss, ':root'), 'background')),
    ).toBeGreaterThanOrEqual(3)
  })
})
