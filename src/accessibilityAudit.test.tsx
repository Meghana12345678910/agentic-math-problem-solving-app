/// <reference types="node" />
import { renderReady as render } from './test/renderReady'
import { readFileSync } from 'node:fs'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { TestRouter } from './test/TestRouter'
import { storageService } from './services/storageService'

afterEach(() => vi.restoreAllMocks())
beforeEach(() => {
  // JSDOM exposes the API but cannot draw; tell axe that canvas is unavailable.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  storageService.clearActiveSession()
  // Vitest does not load Vite's HTML shell. Use the actual document metadata.
  const html = new DOMParser().parseFromString(
    readFileSync('index.html', 'utf8'),
    'text/html',
  )
  document.documentElement.lang = html.documentElement.lang
  document.title = html.title
})

async function audit() {
  const results = await axe.run(document.documentElement, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
    },
    // JSDOM has no layout/canvas engine. Actual CSS contrast has separate tests;
    // browser contrast, zoom, screen-reader output, and reflow need manual review.
    rules: { 'color-contrast': { enabled: false } },
  })
  expect(
    results.violations.map((issue) => ({
      id: issue.id,
      impact: issue.impact,
      help: issue.help,
      nodes: issue.nodes.map((node) => ({
        html: node.html,
        failure: node.failureSummary,
      })),
    })),
  ).toEqual([])
}

const configuration = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
}
async function mount(path: string, state?: unknown) {
  await render(
    <TestRouter initialEntries={[{ pathname: path, state }]}>
      <App />
    </TestRouter>,
  )
}

describe('Phase 20 automated accessibility audit', () => {
  it.each([
    '/',
    '/practice/setup',
    '/practice/card-preview',
    '/statistics',
    '/settings',
    '/missing',
    '/practice/summary',
  ])(
    'has no detectable WCAG or best-practice violations on %s',
    async (path) => {
      await mount(path)
      await audit()
    },
    15000,
  )
  it('audits the card front, revealed answer, and leave confirmation', async () => {
    const user = userEvent.setup()
    await mount('/practice/session', { configuration })
    await audit()
    await user.click(screen.getAllByRole('button', { name: /^Answer / })[0])
    await user.click(screen.getByRole('button', { name: 'Flip Card' }))
    await audit()
    await user.click(
      screen.getByRole('navigation').querySelector('a[href="/statistics"]')!,
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await audit()
  }, 15000)
  it('audits populated statistics and the reset confirmation', async () => {
    storageService.saveAttempt({
      id: 'audit-attempt',
      questionId: 'audit-question',
      sessionId: 'audit-session',
      operation: 'addition',
      difficulty: 1,
      firstOperand: 2,
      secondOperand: 3,
      correctAnswer: 5,
      selectedAnswer: 4,
      selfReportedCorrect: false,
      source: 'regular',
      attemptedAt: '2026-10-21T10:01:00Z',
    })
    await mount('/statistics')
    await audit()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await audit()
  }, 15000)
  it('audits a completed session summary', async () => {
    await mount('/practice/summary', {
      summary: {
        session: {
          ...configuration,
          id: 'audit-session',
          startedAt: '2026-10-21T10:00:00Z',
          completedAt: '2026-10-21T10:05:00Z',
          attempted: 5,
          correct: 3,
          incorrect: 2,
        },
        mistakeReviewCount: 0,
      },
    })
    await audit()
  }, 15000)
})
