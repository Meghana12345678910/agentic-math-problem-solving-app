import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestRouter as MemoryRouter } from '../test/TestRouter'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import {
  storageService,
  defaultSettings,
  createStorageService,
} from '../services/storageService'
import { playFeedbackSound } from '../utils/sound'

vi.mock('../utils/sound', () => ({ playFeedbackSound: vi.fn() }))

function mount(path = '/settings') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Phase 11 settings', () => {
  it('loads application defaults and saves every exposed preference', async () => {
    const user = userEvent.setup()
    const view = mount()
    expect(
      screen.getByRole('checkbox', { name: 'Sound effects' }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Card animation' }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Show explanations' }),
    ).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Sound effects' }))
    await user.click(screen.getByRole('checkbox', { name: 'Card animation' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Show explanations' }),
    )
    await user.click(screen.getByRole('checkbox', { name: 'Division' }))
    await user.click(
      screen.getByRole('radio', { name: 'Level 3: Intermediate' }),
    )
    await user.click(screen.getByRole('radio', { name: '20 questions' }))
    await user.click(screen.getByRole('button', { name: 'Save Settings' }))
    expect(screen.getByRole('status')).toHaveTextContent('Settings saved.')
    expect(createStorageService().loadSettings()).toMatchObject({
      soundEnabled: true,
      animationsEnabled: false,
      showExplanations: false,
      defaultOperations: ['division'],
      defaultDifficulty: 3,
      defaultSessionLength: 20,
    })
    view.unmount()
    mount()
    expect(
      screen.getByRole('checkbox', { name: 'Sound effects' }),
    ).toBeChecked()
    expect(screen.getByRole('radio', { name: '20 questions' })).toBeChecked()
  })

  it('applies saved practice defaults and keeps session overrides separate', async () => {
    const user = userEvent.setup()
    storageService.saveSettings({
      ...defaultSettings,
      defaultOperations: ['addition', 'division'],
      defaultDifficulty: 2,
      defaultSessionLength: 'continuous',
    })
    mount('/practice/setup')
    expect(screen.getByRole('checkbox', { name: 'Addition' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Division' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Level 2: Easy' })).toBeChecked()
    expect(
      screen.getByRole('radio', { name: 'Continuous practice' }),
    ).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Addition' }))
    await user.click(screen.getByRole('radio', { name: 'Level 4: Advanced' }))
    await user.click(screen.getByRole('radio', { name: '5 questions' }))
    await user.click(screen.getByRole('button', { name: 'Start Session' }))
    expect(screen.getByText('division', { selector: 'dd' })).toBeInTheDocument()
    expect(screen.getByText('4', { selector: 'dd' })).toBeInTheDocument()
    expect(storageService.loadSettings()).toMatchObject({
      defaultOperations: ['addition', 'division'],
      defaultDifficulty: 2,
      defaultSessionLength: 'continuous',
    })
  })

  it('does not save a draft until Save Settings is selected', async () => {
    const user = userEvent.setup()
    const view = mount()
    await user.click(screen.getByRole('checkbox', { name: 'Sound effects' }))
    view.unmount()
    mount()
    expect(
      screen.getByRole('checkbox', { name: 'Sound effects' }),
    ).not.toBeChecked()
  })

  it('requires strong confirmation before clearing all app data', async () => {
    const user = userEvent.setup()
    storageService.saveSettings({ ...defaultSettings, soundEnabled: true })
    localStorage.setItem('mathPractice.mistakePatterns', '[{"test":"pattern"}]')
    localStorage.setItem('mathPractice.attempts', '[]')
    localStorage.setItem('mathPractice.sessions', '[]')
    localStorage.setItem('mathPractice.statistics', '{}')
    localStorage.setItem('unrelated', 'keep')
    mount()
    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      /cannot be undone/i,
    )
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(localStorage.getItem('mathPractice.mistakePatterns')).not.toBeNull()
    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(storageService.loadSettings().soundEnabled).toBe(true)
    await user.click(
      screen.getByRole('button', { name: 'Clear All Application Data' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Yes, clear all application data' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Welcome to Math Practice!' }),
    ).toBeInTheDocument()
    for (const key of [
      'attempts',
      'sessions',
      'mistakePatterns',
      'statistics',
      'settings',
    ])
      expect(localStorage.getItem('mathPractice.' + key)).toBeNull()
    expect(createStorageService().loadSettings()).toEqual(defaultSettings)
    expect(localStorage.getItem('unrelated')).toBe('keep')
    expect(JSON.parse(localStorage.getItem('mathPractice.version')!)).toEqual({
      version: 1,
    })
  })

  it('stays on Settings and reports deletion failures', async () => {
    const user = userEvent.setup()
    mount()
    const failure = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new DOMException('Blocked', 'SecurityError')
      })
    try {
      await user.click(
        screen.getByRole('button', { name: 'Clear All Application Data' }),
      )
      await user.click(
        screen.getByRole('button', { name: 'Yes, clear all application data' }),
      )
      expect(
        screen.getByRole('heading', { name: 'Settings' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(
        'could not be erased',
      )
    } finally {
      failure.mockRestore()
    }
  })

  it.each([true, false])(
    'applies explanation preference %s',
    async (showExplanations) => {
      const user = userEvent.setup()
      storageService.saveSettings({ ...defaultSettings, showExplanations })
      mount('/practice/card-preview')
      await user.click(screen.getByRole('button', { name: 'Answer 56' }))
      await user.click(screen.getByRole('button', { name: 'Flip Card' }))
      if (showExplanations)
        expect(screen.getByText('7 groups of 8 make 56.')).toBeInTheDocument()
      else
        expect(
          screen.queryByText('7 groups of 8 make 56.'),
        ).not.toBeInTheDocument()
    },
  )

  it.each([true, false])(
    'applies sound preference %s when self-assessing',
    async (soundEnabled) => {
      vi.mocked(playFeedbackSound).mockClear()
      const user = userEvent.setup()
      storageService.saveSettings({ ...defaultSettings, soundEnabled })
      mount('/practice/card-preview')
      await user.click(screen.getByRole('button', { name: 'Answer 56' }))
      await user.click(screen.getByRole('button', { name: 'Flip Card' }))
      await user.click(screen.getByRole('button', { name: 'I Got It Right' }))
      expect(playFeedbackSound).toHaveBeenCalledTimes(soundEnabled ? 1 : 0)
    },
  )
})
