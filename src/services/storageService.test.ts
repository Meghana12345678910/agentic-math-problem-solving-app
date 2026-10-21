import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  createStorageService,
  defaultSettings,
  isAttempt,
  isSession,
  isSettings,
} from './storageService'
import { usePracticeSession } from '../hooks/usePracticeSession'
import type { PracticeSession, PracticeAttempt } from '../types/session'

const session: PracticeSession = {
  id: 'session',
  startedAt: '2026-10-21T10:00:00Z',
  operations: ['addition'],
  difficulty: 1,
  sessionLength: 5,
  attempted: 1,
  correct: 0,
  incorrect: 1,
}
const attempt: PracticeAttempt = {
  id: 'attempt',
  sessionId: 'session',
  questionId: 'question',
  operation: 'addition',
  firstOperand: 2,
  secondOperand: 3,
  correctAnswer: 5,
  selectedAnswer: 4,
  selfReportedCorrect: false,
  difficulty: 1,
  source: 'regular',
  attemptedAt: '2026-10-21T10:01:00Z',
}

describe('Phase 9 storage', () => {
  it('initializes version and defaults without touching unrelated keys', () => {
    localStorage.setItem('other-app', 'keep')
    const service = createStorageService()
    service.initialize()
    expect(JSON.parse(localStorage.getItem('mathPractice.version')!)).toEqual({
      version: 1,
    })
    expect(service.loadSettings()).toEqual(defaultSettings)
    expect(localStorage.getItem('other-app')).toBe('keep')
  })
  it.each([null, '{"version":0}'])(
    'migrates missing or old version %s without deleting records',
    (version) => {
      if (version) localStorage.setItem('mathPractice.version', version)
      localStorage.setItem('mathPractice.attempts', JSON.stringify([attempt]))
      const service = createStorageService()
      service.initialize()
      expect(service.loadAttempts()).toEqual([attempt])
      expect(JSON.parse(localStorage.getItem('mathPractice.version')!)).toEqual(
        { version: 1 },
      )
    },
  )
  it('protects a future schema from writes', () => {
    localStorage.setItem('mathPractice.version', '{"version":99}')
    const service = createStorageService()
    expect(service.saveSettings(defaultSettings)).toBe(false)
    expect(localStorage.getItem('mathPractice.settings')).toBeNull()
    expect(localStorage.getItem('mathPractice.version')).toBe('{"version":99}')
    expect(service.getWarning()).toContain('newer app version')
  })
  it('persists settings across a new service instance', () => {
    const service = createStorageService()
    service.saveSettings({ ...defaultSettings, animationsEnabled: false })
    expect(createStorageService().loadSettings().animationsEnabled).toBe(false)
  })
  it.each(['broken JSON', '{"animationsEnabled":"wrong"}'])(
    'recovers invalid settings %s without losing history',
    (raw) => {
      localStorage.setItem('mathPractice.settings', raw)
      localStorage.setItem('mathPractice.attempts', JSON.stringify([attempt]))
      const service = createStorageService()
      expect(service.loadSettings()).toEqual(defaultSettings)
      expect(service.loadAttempts()).toEqual([attempt])
      expect(service.getWarning()).not.toBe('')
    },
  )
  it('upserts sessions and loads most recent first with a 100-record limit', () => {
    const service = createStorageService()
    for (let i = 0; i < 105; i += 1)
      service.saveSession({
        ...session,
        id: 'session-' + i,
        startedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      })
    expect(service.loadSessions()).toHaveLength(100)
    expect(service.loadSessions()[0].id).toBe('session-104')
    service.saveSession({
      ...service.loadSessions()[0],
      completedAt: '2026-10-21T11:00:00Z',
    })
    expect(createStorageService().loadSessions()).toHaveLength(100)
    expect(createStorageService().loadSessions()[0].completedAt).toBe(
      '2026-10-21T11:00:00Z',
    )
  })
  it('retains attempts across reloads and deduplicates question recording', () => {
    const service = createStorageService()
    service.saveAttempt(attempt)
    service.saveAttempt({ ...attempt, id: 'duplicate' })
    expect(createStorageService().loadAttempts()).toEqual([attempt])
  })
  it('continues in memory when storage access is blocked', () => {
    const service = createStorageService(() => {
      throw new DOMException('Blocked', 'SecurityError')
    })
    service.initialize()
    service.saveAttempt(attempt)
    service.saveAttempt({ ...attempt, id: 'second', questionId: 'second' })
    service.saveSession(session)
    expect(service.loadAttempts()).toHaveLength(2)
    expect(service.loadSessions()).toEqual([session])
    expect(service.getWarning()).toContain('keep practicing')
  })
  it('keeps multiple unsaved writes in memory when capacity is full', () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new DOMException('Full', 'QuotaExceededError')
      }),
    } as unknown as Storage
    const service = createStorageService(() => storage)
    service.saveAttempt(attempt)
    service.saveAttempt({ ...attempt, id: 'second', questionId: 'second' })
    expect(service.loadAttempts()).toHaveLength(2)
    expect(service.getWarning()).toContain('could not be saved')
  })
  it('rejects invalid records and loads corrupted lists safely', () => {
    expect(isSession({ ...session, correct: 20 })).toBe(false)
    expect(
      isAttempt({ ...attempt, secondOperand: 0, operation: 'division' }),
    ).toBe(false)
    expect(isAttempt({ ...attempt, selectedAnswer: 1.5 })).toBe(false)
    expect(isSettings({ ...defaultSettings, masteryThreshold: 0 })).toBe(false)
    const service = createStorageService()
    expect(() =>
      service.saveAttempt({ ...attempt, selectedAnswer: -1 }),
    ).toThrow()
    localStorage.setItem('mathPractice.sessions', JSON.stringify([{}]))
    localStorage.setItem('mathPractice.attempts', 'null')
    expect(service.loadSessions()).toEqual([])
    expect(service.loadAttempts()).toEqual([])
  })
  it('persists accepted hook attempts and session completion', () => {
    const { result } = renderHook(() =>
      usePracticeSession({
        operations: ['addition'],
        difficulty: 1,
        sessionLength: 'continuous',
      }),
    )
    const initial = result.current
    act(() =>
      initial.recordResult(
        initial.question.id,
        initial.question.choices[0],
        false,
      ),
    )
    act(() => result.current.endSession())
    const fresh = createStorageService()
    expect(fresh.loadAttempts()).toHaveLength(1)
    expect(fresh.loadAttempts()[0]).toMatchObject({
      sessionId: initial.session.id,
      selectedAnswer: initial.question.choices[0],
      selfReportedCorrect: false,
    })
    expect(
      fresh.loadSessions().find((value) => value.id === initial.session.id)
        ?.completedAt,
    ).toBeTruthy()
  })
})
