import { reportResult } from '../test/reportResult'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePracticeSession } from './usePracticeSession'
import {
  storageService,
  isActiveSessionSnapshot,
} from '../services/storageService'
import type { PracticeConfiguration } from '../types/practiceConfiguration'

const configuration: PracticeConfiguration = {
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
}
beforeEach(() => storageService.clearActiveSession())
afterEach(() => vi.unstubAllGlobals())
const saved = () => structuredClone(storageService.loadActiveSession()!)
function answer(
  tab: { result: { current: ReturnType<typeof usePracticeSession> } },
  correct = true,
) {
  const question = tab.result.current.question
  act(() => {
    void reportResult(
      tab.result.current,
      question.id,
      question.choices[0],
      correct,
    )
  })
}

describe('shared-session stale-tab regression', () => {
  it('ignores an old answer and adopts newer progress without changing accepted history or mistakes', () => {
    const first = renderHook(() => usePracticeSession(configuration))
    const restore = saved()
    const older = renderHook(() => usePracticeSession(configuration, restore))
    answer(first)
    answer(first)
    const latest = saved()
    answer(older, false)
    expect(older.result.current.session.attempted).toBe(2)
    expect(older.result.current.question.id).toBe(latest.question.id)
    expect(storageService.loadAttempts()).toHaveLength(2)
    expect(storageService.loadMistakePatterns()).toEqual([])
    expect(storageService.loadSessions()[0]).toMatchObject({
      attempted: 2,
      correct: 2,
      incorrect: 0,
    })
    expect(saved()).toMatchObject({
      session: { attempted: 2 },
      question: { id: latest.question.id },
    })
    expect(isActiveSessionSnapshot(saved())).toBe(true)
  })

  it.each([false, true])(
    'does not overwrite recovery when a stale tab selects/flips (flipped=%s)',
    (flipped) => {
      const first = renderHook(() => usePracticeSession(configuration))
      const restore = saved()
      const older = renderHook(() => usePracticeSession(configuration, restore))
      answer(first)
      answer(first)
      const latest = saved()
      act(() => {
        void older.result.current.updateCard(
          restore.question.choices[0],
          flipped,
        )
      })
      expect(saved()).toEqual(latest)
      expect(older.result.current.question.id).toBe(latest.question.id)
    },
  )

  it('does not overwrite newer progress when mounting a stale restored snapshot', () => {
    const first = renderHook(() => usePracticeSession(configuration))
    const restore = saved()
    answer(first)
    answer(first)
    const latest = saved()
    const older = renderHook(() => usePracticeSession(configuration, restore))
    expect(older.result.current.session.attempted).toBe(2)
    expect(saved()).toEqual(latest)
    expect(storageService.loadSessions()[0].attempted).toBe(2)
  })

  it('ends the latest continuous session from an older tab without losing totals', () => {
    const config = { ...configuration, sessionLength: 'continuous' as const }
    const first = renderHook(() => usePracticeSession(config))
    const restore = saved()
    const older = renderHook(() => usePracticeSession(config, restore))
    answer(first)
    answer(first, false)
    act(() => {
      void older.result.current.endSession()
    })
    expect(older.result.current.session).toMatchObject({
      attempted: 2,
      correct: 1,
      incorrect: 1,
    })
    expect(storageService.loadSessions()[0]).toMatchObject({
      attempted: 2,
      correct: 1,
      incorrect: 1,
      completedAt: expect.any(String),
    })
    expect(storageService.loadActiveSession()).toBeNull()
  })

  it('cannot reopen a session completed in another tab', () => {
    const first = renderHook(() => usePracticeSession(configuration))
    const restore = saved()
    const older = renderHook(() => usePracticeSession(configuration, restore))
    for (let index = 0; index < 5; index++) answer(first)
    answer(older, false)
    expect(older.result.current.active).toBe(false)
    expect(older.result.current.session.attempted).toBe(5)
    expect(older.result.current.attempts).toHaveLength(5)
    expect(storageService.loadActiveSession()).toBeNull()
    expect(storageService.loadAttempts()).toHaveLength(5)
  })

  it('serializes overlapping updates with the same cross-tab Web Lock', async () => {
    let queue = Promise.resolve()
    const request = vi.fn((_name: string, callback: () => void) => {
      const next = queue.then(callback)
      queue = next
      return next
    })
    vi.stubGlobal('navigator', { locks: { request } })
    const first = renderHook(() => usePracticeSession(configuration))
    await act(async () => {
      await queue
    })
    const restore = saved()
    const older = renderHook(() => usePracticeSession(configuration, restore))
    await act(async () => {
      await queue
    })
    await act(async () => {
      const question = restore.question
      await Promise.all([
        reportResult(
          first.result.current,
          question.id,
          question.choices[0],
          true,
        ),
        reportResult(
          older.result.current,
          question.id,
          question.choices[0],
          false,
        ),
      ])
    })
    expect(request).toHaveBeenCalled()
    expect(new Set(request.mock.calls.map((call) => call[0])).size).toBe(1)
    expect(storageService.loadAttempts()).toHaveLength(1)
    expect(storageService.loadSessions()[0]).toMatchObject({
      attempted: 1,
      correct: 1,
      incorrect: 0,
    })
    expect(older.result.current.question.id).toBe(
      first.result.current.question.id,
    )
  })
})

it('keeps practice usable when the browser denies lock acquisition', async () => {
  vi.stubGlobal('navigator', {
    locks: {
      request: vi.fn(() =>
        Promise.reject(new DOMException('Denied', 'SecurityError')),
      ),
    },
  })
  const tab = renderHook(() => usePracticeSession(configuration))
  await act(async () => {
    await Promise.resolve()
  })
  await act(async () => {
    const question = tab.result.current.question
    await reportResult(
      tab.result.current,
      question.id,
      question.choices[0],
      true,
    )
  })
  expect(storageService.loadAttempts()).toHaveLength(1)
  expect(isActiveSessionSnapshot(saved())).toBe(true)
})
