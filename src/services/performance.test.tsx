import { reportResult } from '../test/reportResult'
import { createLargeHistory as makeAttempts } from '../test/largeHistory'
import { act, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { renderReady } from '../test/renderReady'
import { TestRouter } from '../test/TestRouter'
import StatisticsPage from '../pages/StatisticsPage'
import {
  createStorageService,
  defaultSettings,
  storageService,
} from './storageService'
import * as totals from './statisticsService'
import * as mistakes from './mistakeStatisticsService'
import * as questions from './questionGenerator'
import { usePracticeSession } from '../hooks/usePracticeSession'
import type { PracticeSession } from '../types/session'

beforeEach(() => storageService.clearActiveSession())
afterEach(() => vi.restoreAllMocks())
const configuration = {
  operations: ['addition' as const],
  difficulty: 1 as const,
  sessionLength: 5 as const,
}

describe('Phase 21 large history and storage work', () => {
  it('loads 5000 attempts, measures bytes, and retains aggregate/review totals after trimming session details', () => {
    const attempts = makeAttempts(5000)
    localStorage.setItem('mathPractice.attempts', JSON.stringify(attempts))
    localStorage.setItem('unrelated', 'keep')
    const service = createStorageService()
    const start = performance.now()
    const loaded = service.loadAttempts()
    const expected = totals.calculateStatistics(loaded)
    expect(loaded).toHaveLength(5000)
    expect(expected).toMatchObject({
      attempted: 5000,
      correct: 3333,
      incorrect: 1667,
    })
    const review = mistakes.calculateMistakeStatistics([], loaded)
    expect(review.reviewAttempted).toBe(1250)
    const session: PracticeSession = {
      ...configuration,
      id: 'session',
      startedAt: '2026-10-21T10:00:00Z',
      attempted: 5,
      correct: 3,
      incorrect: 2,
    }
    for (let index = 0; index < 130; index++)
      service.saveSession({
        ...session,
        id: String(index),
        startedAt: new Date(1760000000000 + index * 1000).toISOString(),
      })
    const fresh = createStorageService()
    expect(fresh.loadSessions()).toHaveLength(100)
    expect(fresh.loadSessions()[0].id).toBe('129')
    expect(fresh.loadSessions().at(-1)!.id).toBe('30')
    expect(totals.calculateStatistics(fresh.loadAttempts())).toEqual(expected)
    expect(
      mistakes.calculateMistakeStatistics([], fresh.loadAttempts())
        .reviewAttempted,
    ).toBe(1250)
    const usage = fresh.measureStorageUsage()!
    expect(usage.totalBytes).toBe(
      Object.values(usage.byCategory).reduce((sum, bytes) => sum + bytes, 0),
    )
    expect(usage.totalBytes).toBeLessThan(5 * 1024 * 1024)
    expect(usage.byCategory.attempts).toBe(
      ('mathPractice.attempts'.length + JSON.stringify(attempts).length) * 2,
    )
    console.info(
      'Phase 21 benchmark',
      JSON.stringify({
        attempts: loaded.length,
        retainedSessions: 100,
        utf16Bytes: usage.totalBytes,
        loadAndRetentionMs: Math.round(performance.now() - start),
      }),
    )
    expect(localStorage.getItem('unrelated')).toBe('keep')
    service.saveAttempt({
      ...attempts[0],
      id: crypto.randomUUID(),
      questionId: crypto.randomUUID(),
    })
    expect(createStorageService().loadAttempts()).toHaveLength(5001)
  }, 15000)

  it('reuses validated JSON until the stored value changes and notices removal or corruption', () => {
    localStorage.setItem(
      'mathPractice.attempts',
      JSON.stringify(makeAttempts(5)),
    )
    const service = createStorageService()
    const first = service.loadAttempts()
    const parse = vi.spyOn(JSON, 'parse')
    expect(service.loadAttempts()).toBe(first)
    expect(parse).not.toHaveBeenCalled()
    localStorage.setItem(
      'mathPractice.attempts',
      JSON.stringify(first.slice(1)),
    )
    expect(service.loadAttempts()).toHaveLength(4)
    expect(parse).toHaveBeenCalledTimes(1)
    localStorage.setItem('mathPractice.attempts', 'broken')
    expect(service.loadAttempts()).toEqual([])
    localStorage.removeItem('mathPractice.attempts')
    expect(service.loadAttempts()).toEqual([])
  })

  it('avoids identical writes but retries previously failed writes', () => {
    const service = createStorageService()
    service.saveSettings(defaultSettings)
    const set = vi.spyOn(Storage.prototype, 'setItem')
    expect(service.saveSettings(defaultSettings)).toBe(true)
    expect(set).not.toHaveBeenCalled()
    set.mockImplementationOnce(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    const changed = { ...defaultSettings, soundEnabled: true }
    expect(service.saveSettings(changed)).toBe(false)
    expect(service.loadSettings().soundEnabled).toBe(true)
    expect(service.saveSettings(changed)).toBe(true)
    expect(createStorageService().loadSettings()).toEqual(changed)
  })

  it('reports unavailable storage without throwing', () => {
    const service = createStorageService(() => {
      throw new Error('blocked')
    })
    expect(service.measureStorageUsage()).toBeNull()
    expect(service.getWarning()).toContain('keep practicing')
  })
})

describe('Phase 21 rendering and persistence', () => {
  it('does not regenerate questions or rewrite session totals for answer selection and flip', () => {
    const session = vi.spyOn(storageService, 'saveSession')
    const snapshot = vi.spyOn(storageService, 'saveActiveSession')
    const generate = vi.spyOn(questions, 'generateQuestion')
    const { result, rerender } = renderHook(() =>
      usePracticeSession({ ...configuration }),
    )
    const original = result.current.question
    session.mockClear()
    snapshot.mockClear()
    generate.mockClear()
    const selected = original.choices[0]
    act(() => result.current.updateCard(selected, false))
    act(() => result.current.updateCard(selected, false))
    rerender()
    expect(session).not.toHaveBeenCalled()
    expect(snapshot).toHaveBeenCalledTimes(1)
    act(() => result.current.updateCard(selected, true))
    expect(snapshot).toHaveBeenCalledTimes(2)
    expect(generate).not.toHaveBeenCalled()
    act(() => reportResult(result.current, original.id, selected, true))
    expect(session).toHaveBeenCalledTimes(1)
    expect(snapshot).toHaveBeenCalledTimes(3)
    expect(generate).toHaveBeenCalled()
  })

  it('does not recalculate history for dialog or mastered-section toggles, but refreshes on reset', async () => {
    const overall = vi.spyOn(totals, 'calculateStatistics')
    const review = vi.spyOn(mistakes, 'calculateMistakeStatistics')
    await renderReady(
      <TestRouter>
        <StatisticsPage />
      </TestRouter>,
    )
    overall.mockClear()
    review.mockClear()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(
      screen.getByRole('button', { name: 'Mastered patterns (0)' }),
    )
    expect(overall).not.toHaveBeenCalled()
    expect(review).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Reset Statistics' }))
    await user.click(
      screen.getByRole('button', { name: 'Yes, reset statistics' }),
    )
    expect(review).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent('have been reset')
  })
})
