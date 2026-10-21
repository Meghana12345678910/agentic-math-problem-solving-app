import { describe, expect, it, vi } from 'vitest'
import { createStorageService, defaultSettings } from './storageService'
import { generateQuestion, isValidQuestion } from './questionGenerator'
import { recoverQuestion, questionRetryLimit } from './questionRecovery'
import { createSimilarQuestionGenerator } from './similarQuestionGenerator'

const pattern = {
  id: 'parent',
  operation: 'addition' as const,
  difficulty: 1 as const,
  firstOperand: 2,
  secondOperand: 3,
  correctAnswer: 5,
  incorrectCount: 1,
  similarCorrectCount: 0,
  lastIncorrectAt: '2026-10-21T10:00:00Z',
  mastered: false,
}

describe('Phase 19 storage recovery', () => {
  it.each(['settings', 'attempts', 'sessions', 'mistakePatterns'])(
    'repairs only malformed %s and persists the repair',
    (category) => {
      localStorage.setItem('other-app', 'keep')
      localStorage.setItem(
        'mathPractice.settings',
        JSON.stringify(defaultSettings),
      )
      localStorage.setItem('mathPractice.attempts', '[]')
      localStorage.setItem('mathPractice.sessions', '[]')
      localStorage.setItem(
        'mathPractice.mistakePatterns',
        JSON.stringify([pattern]),
      )
      localStorage.setItem('mathPractice.' + category, '{broken')
      const before = { ...localStorage }
      const service = createStorageService()
      const loaders = {
        settings: service.loadSettings,
        attempts: service.loadAttempts,
        sessions: service.loadSessions,
        mistakePatterns: service.loadMistakePatterns,
      }
      const expected = category === 'settings' ? defaultSettings : []
      expect(loaders[category as keyof typeof loaders]()).toEqual(expected)
      expect(
        JSON.parse(localStorage.getItem('mathPractice.' + category)!),
      ).toEqual(expected)
      for (const [key, value] of Object.entries(before))
        if (key !== 'mathPractice.' + category)
          expect(localStorage.getItem(key)).toBe(value)
      expect(service.getWarning()).toContain('reset')
      expect(
        createStorageService()[
          category === 'settings'
            ? 'loadSettings'
            : category === 'attempts'
              ? 'loadAttempts'
              : category === 'sessions'
                ? 'loadSessions'
                : 'loadMistakePatterns'
        ](),
      ).toEqual(expected)
    },
  )
  it.each(['settings', 'attempts', 'sessions', 'mistakePatterns'])(
    'repairs structurally invalid %s',
    (category) => {
      localStorage.setItem(
        'mathPractice.' + category,
        JSON.stringify({ invalid: true }),
      )
      const service = createStorageService()
      const loaders = {
        settings: service.loadSettings,
        attempts: service.loadAttempts,
        sessions: service.loadSessions,
        mistakePatterns: service.loadMistakePatterns,
      }
      expect(loaders[category as keyof typeof loaders]()).toEqual(
        category === 'settings' ? defaultSettings : [],
      )
      expect(service.getWarning()).not.toBe('')
    },
  )
  it('retains valid mistake records while permanently removing invalid ones', () => {
    localStorage.setItem(
      'mathPractice.mistakePatterns',
      JSON.stringify([pattern, { ...pattern, id: 'bad', incorrectCount: -1 }]),
    )
    expect(createStorageService().loadMistakePatterns()).toEqual([pattern])
    expect(
      JSON.parse(localStorage.getItem('mathPractice.mistakePatterns')!),
    ).toEqual([pattern])
  })
  it('continues safely when both reading and repairing storage are blocked', () => {
    const service = createStorageService(() => {
      throw new Error('blocked')
    })
    expect(service.loadSettings()).toEqual(defaultSettings)
    expect(
      service.saveSettings({ ...defaultSettings, soundEnabled: true }),
    ).toBe(false)
    expect(service.loadSettings().soundEnabled).toBe(true)
    expect(service.loadAttempts()).toEqual([])
    expect(service.getWarning()).toContain('keep practicing')
  })
})

describe('Phase 19 generation recovery', () => {
  it('rejects malformed runtime values without crashing validation', () => {
    for (const value of [null, undefined, {}, { choices: null }, 3])
      expect(isValidQuestion(value)).toBe(false)
  })
  it('retries invalid choices and succeeds before needing fallback', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const good = generateQuestion('addition', 1, () => 0)
    const generate = vi
      .fn()
      .mockReturnValueOnce({ ...good, choices: [0, 0, 1, 2] })
      .mockReturnValue(good)
    const fallback = vi.fn(() => good)
    expect(recoverQuestion(generate, fallback)).toEqual(good)
    expect(generate).toHaveBeenCalledTimes(2)
    expect(fallback).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('1/3'),
      expect.any(Error),
    )
    log.mockRestore()
  })
  it('bounds thrown failures and validates the fallback too', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const generate = vi.fn(() => {
      throw new Error('failure')
    })
    const fallback = vi.fn(() => generateQuestion('division', 4, () => 0))
    expect(isValidQuestion(recoverQuestion(generate, fallback))).toBe(true)
    expect(generate).toHaveBeenCalledTimes(questionRetryLimit)
    expect(fallback).toHaveBeenCalledTimes(1)
    expect(() =>
      recoverQuestion(
        () => null,
        () => null as never,
      ),
    ).toThrow('Fallback')
    log.mockRestore()
  })
  it('keeps regular fallback questions within every operation and difficulty', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    for (const operation of [
      'addition',
      'subtraction',
      'multiplication',
      'division',
    ] as const)
      for (const difficulty of [1, 2, 3, 4] as const) {
        const random = vi.fn(() => NaN)
        const question = generateQuestion(operation, difficulty, random)
        expect(isValidQuestion(question)).toBe(true)
        expect(question.operation).toBe(operation)
        expect(question.difficulty).toBe(difficulty)
        expect(random).toHaveBeenCalledTimes(questionRetryLimit)
      }
    log.mockRestore()
  })
  it('keeps review fallback related to the same parent and allowed operation', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const question = createSimilarQuestionGenerator()(pattern, {
      allowedOperations: ['addition'],
      random: () => NaN,
    })
    expect(isValidQuestion(question)).toBe(true)
    expect(question.mistakePatternId).toBe(pattern.id)
    expect(question.operation).toBe('addition')
    expect([question.firstOperand, question.secondOperand]).not.toEqual([2, 3])
    log.mockRestore()
  })
})
