import type { MistakePattern } from '../types/mistake'
import {
  mistakePatternKey,
  updateMistakePatterns,
  updateReviewPattern,
} from './mistakeService'
import { calculateStatistics } from './statisticsService'
import type { AppSettings } from '../types/settings'
import type { PracticeAttempt, PracticeSession } from '../types/session'
import { isPracticeConfiguration } from '../utils/practiceConfiguration'

export const defaultSettings: AppSettings = {
  soundEnabled: false,
  feedbackEffectsEnabled: true,
  animationsEnabled: true,
  showExplanations: true,
  defaultSessionLength: 10,
  defaultDifficulty: 1,
  defaultOperations: [],
  masteryThreshold: 3,
}
const prefix = 'mathPractice.'
const schemaVersion = 1
const recentSessionLimit = 100
type RecordValue = Record<string, unknown>
const record = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const integer = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0
const date = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))
const id = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0
const operation = (value: unknown) =>
  ['addition', 'subtraction', 'multiplication', 'division'].includes(
    value as string,
  )
const difficulty = (value: unknown) => [1, 2, 3, 4].includes(value as number)

export function isSettings(value: unknown): value is AppSettings {
  return (
    record(value) &&
    (value.feedbackEffectsEnabled === undefined ||
      typeof value.feedbackEffectsEnabled === 'boolean') &&
    ['soundEnabled', 'animationsEnabled', 'showExplanations'].every(
      (key) => typeof value[key] === 'boolean',
    ) &&
    [5, 10, 20, 'continuous'].includes(
      value.defaultSessionLength as number | string,
    ) &&
    difficulty(value.defaultDifficulty) &&
    Array.isArray(value.defaultOperations) &&
    value.defaultOperations.every(operation) &&
    new Set(value.defaultOperations).size === value.defaultOperations.length &&
    integer(value.masteryThreshold) &&
    value.masteryThreshold > 0
  )
}
export function isSession(value: unknown): value is PracticeSession {
  return (
    record(value) &&
    isPracticeConfiguration(value) &&
    id(value.id) &&
    date(value.startedAt) &&
    (value.completedAt === undefined ||
      (date(value.completedAt) &&
        Date.parse(value.completedAt) >= Date.parse(value.startedAt))) &&
    integer(value.attempted) &&
    integer(value.correct) &&
    integer(value.incorrect) &&
    value.correct + value.incorrect === value.attempted &&
    (value.sessionLength === 'continuous' ||
      value.attempted <= value.sessionLength)
  )
}
export function isAttempt(value: unknown): value is PracticeAttempt {
  if (
    !record(value) ||
    !id(value.id) ||
    !id(value.questionId) ||
    !id(value.sessionId) ||
    !operation(value.operation) ||
    !difficulty(value.difficulty) ||
    !date(value.attemptedAt) ||
    typeof value.selfReportedCorrect !== 'boolean' ||
    (value.source === 'mistake-review' && !id(value.mistakePatternId)) ||
    !['regular', 'mistake-review'].includes(value.source as string) ||
    ![
      value.firstOperand,
      value.secondOperand,
      value.correctAnswer,
      value.selectedAnswer,
    ].every(integer)
  )
    return false
  const first = value.firstOperand as number
  const second = value.secondOperand as number
  const answer =
    value.operation === 'addition'
      ? first + second
      : value.operation === 'subtraction'
        ? first - second
        : value.operation === 'multiplication'
          ? first * second
          : second === 0
            ? NaN
            : first / second
  return answer === value.correctAnswer
}

export function isMistakePattern(value: unknown): value is MistakePattern {
  if (
    !record(value) ||
    !id(value.id) ||
    !operation(value.operation) ||
    !difficulty(value.difficulty) ||
    ![
      value.firstOperand,
      value.secondOperand,
      value.correctAnswer,
      value.similarCorrectCount,
    ].every(integer) ||
    !integer(value.incorrectCount) ||
    value.incorrectCount < 1 ||
    !date(value.lastIncorrectAt) ||
    typeof value.mastered !== 'boolean'
  )
    return false
  const first = value.firstOperand as number
  const second = value.secondOperand as number
  const answer =
    value.operation === 'addition'
      ? first + second
      : value.operation === 'subtraction'
        ? first - second
        : value.operation === 'multiplication'
          ? first * second
          : second === 0
            ? NaN
            : first / second
  return answer === value.correctAnswer
}
/** Inject the browser storage accessor so blocked storage can be tested. */
export function createStorageService(
  getStorage: () => Storage = () => window.localStorage,
) {
  const memory = new Map<string, unknown>()
  const pending = new Set<string>()
  let initialized = false
  const listeners = new Set<() => void>()
  let warning = ''
  let futureVersion = false
  function warn(
    message = 'Your progress could not be saved on this device. You can keep practicing, but new progress may be lost when you close this page.',
  ) {
    if (warning === message) return
    warning = message
    queueMicrotask(() => listeners.forEach((listener) => listener()))
  }
  function read<T>(
    name: string,
    valid: (value: unknown) => value is T,
    fallback: T,
  ): T {
    if (!initialized) initialize()
    const key = prefix + name
    if (pending.has(key)) {
      const cached = memory.get(key)
      return valid(cached) ? cached : fallback
    }
    try {
      const raw = getStorage().getItem(key)
      if (raw === null) return fallback
      const value: unknown = JSON.parse(raw)
      if (!valid(value)) throw new Error('Invalid stored data')
      memory.set(key, value)
      return value
    } catch {
      warn()
      const cached = memory.get(key)
      return valid(cached) ? cached : fallback
    }
  }
  function write<T>(name: string, value: T): boolean {
    if (!initialized) initialize()
    const key = prefix + name
    memory.set(key, value)
    pending.add(key)
    if (futureVersion) return false
    try {
      getStorage().setItem(key, JSON.stringify(value))
      pending.delete(key)
      return true
    } catch {
      warn()
      return false
    }
  }

  // Version 0/missing used the same records. Future migrations can transform
  // only this app's keys before advancing the version.
  const migrations: Record<number, () => void> = { 0: () => {} }
  function initialize() {
    if (initialized) return
    initialized = true
    try {
      const raw = getStorage().getItem(prefix + 'version')
      const parsed: unknown = raw === null ? { version: 0 } : JSON.parse(raw)
      if (!record(parsed) || !integer(parsed.version))
        throw new Error('Invalid schema version')
      if (parsed.version > schemaVersion) {
        futureVersion = true
        warn(
          'This saved progress comes from a newer app version. You can practice, but this version will not overwrite it.',
        )
        return
      }
      for (let version = parsed.version; version < schemaVersion; version += 1)
        migrations[version]()
      write('version', { version: schemaVersion })
    } catch {
      warn()
    }
  }
  const sessionList = (value: unknown): value is PracticeSession[] =>
    Array.isArray(value) && value.every(isSession)
  const attemptList = (value: unknown): value is PracticeAttempt[] =>
    Array.isArray(value) && value.every(isAttempt)
  function loadSettings() {
    return read('settings', isSettings, {
      ...defaultSettings,
      defaultOperations: [],
    })
  }
  function saveSettings(settings: AppSettings) {
    if (!isSettings(settings)) throw new Error('Invalid settings')
    return write('settings', settings)
  }
  function loadSessions() {
    return read('sessions', sessionList, [])
      .slice()
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, recentSessionLimit)
  }
  function saveSession(session: PracticeSession) {
    if (!isSession(session)) throw new Error('Invalid session')
    const sessions = [
      session,
      ...loadSessions().filter((existing) => existing.id !== session.id),
    ]
    return write(
      'sessions',
      sessions
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, recentSessionLimit),
    )
  }
  function loadAttempts() {
    return read('attempts', attemptList, [])
  }
  function loadMistakePatterns(): MistakePattern[] {
    const records = read(
      'mistakePatterns',
      (value: unknown): value is unknown[] => Array.isArray(value),
      [],
    )
    const unique = new Map<string, MistakePattern>()
    for (const value of records) {
      if (!isMistakePattern(value)) {
        warn()
        continue
      }
      const key = mistakePatternKey(value)
      const existing = unique.get(key)
      if (!existing) unique.set(key, value)
      else {
        const latest =
          Date.parse(value.lastIncorrectAt) >
          Date.parse(existing.lastIncorrectAt)
            ? value
            : existing
        unique.set(key, {
          ...latest,
          id: existing.id,
          incorrectCount: Math.max(
            existing.incorrectCount,
            value.incorrectCount,
          ),
        })
        warn()
      }
    }
    return [...unique.values()]
  }
  function saveMistakePatterns(patterns: MistakePattern[]) {
    if (
      !patterns.every(isMistakePattern) ||
      new Set(patterns.map(mistakePatternKey)).size !== patterns.length
    ) {
      throw new Error('Invalid or duplicate mistake patterns')
    }
    return write('mistakePatterns', patterns)
  }
  function saveAttempt(attempt: PracticeAttempt) {
    if (!isAttempt(attempt)) throw new Error('Invalid attempt')
    const attempts = loadAttempts()
    if (
      attempts.some(
        (existing) =>
          existing.id === attempt.id ||
          (existing.sessionId === attempt.sessionId &&
            existing.questionId === attempt.questionId),
      )
    )
      return true
    const saved = write('attempts', [...attempts, attempt])
    if (attempt.source === 'mistake-review') {
      const updated = updateReviewPattern(
        loadMistakePatterns(),
        attempt,
        loadSettings().masteryThreshold,
      )
      return saveMistakePatterns(updated) && saved
    }
    if (!attempt.selfReportedCorrect) {
      const patternsSaved = saveMistakePatterns(
        updateMistakePatterns(loadMistakePatterns(), attempt),
      )
      return saved && patternsSaved
    }
    return saved
  }
  function clearAllData() {
    if (!initialized) initialize()
    // This explicit clear-all action also permits removing newer-version app data.
    futureVersion = false
    const clearedValues: Record<string, unknown> = {
      settings: { ...defaultSettings, defaultOperations: [] },
      attempts: [],
      sessions: [],
      mistakePatterns: [],
      statistics: calculateStatistics([]),
    }
    let saved = true
    for (const [name, value] of Object.entries(clearedValues)) {
      const key = prefix + name
      memory.set(key, value)
      pending.add(key)
      try {
        getStorage().removeItem(key)
        pending.delete(key)
      } catch {
        saved = false
        warn()
      }
    }
    const versionSaved = write('version', { version: schemaVersion })
    return saved && versionSaved
  }
  function resetStatistics() {
    const results = [
      write('attempts', []),
      write('sessions', []),
      write('statistics', calculateStatistics([])),
    ]
    return results.every(Boolean)
  }
  return {
    clearAllData,
    resetStatistics,
    initialize,
    loadMistakePatterns,
    saveMistakePatterns,
    loadSettings,
    saveSettings,
    loadSessions,
    saveSession,
    loadAttempts,
    saveAttempt,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getWarning: () => warning,
  }
}
export const storageService = createStorageService()
