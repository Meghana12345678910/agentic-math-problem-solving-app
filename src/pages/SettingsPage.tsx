import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageService } from '../services/storageService'
import OperationSelector from '../components/practice/OperationSelector'
import DifficultySelector from '../components/practice/DifficultySelector'
import SessionLengthSelector from '../components/practice/SessionLengthSelector'
import ConfirmDialog from '../components/common/ConfirmDialog'
import type { PracticeSessionLength } from '../types/practiceConfiguration'

function SettingsPage() {
  const [settings, setSettings] = useState(() => storageService.loadSettings())
  const [message, setMessage] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const navigate = useNavigate()

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const saved = storageService.saveSettings(settings)
    setMessage(
      saved
        ? 'Settings saved.'
        : 'Settings apply for now, but could not be saved on this device.',
    )
  }
  function clearAll() {
    const cleared = storageService.clearAllData()
    setConfirmClear(false)
    setSettings(storageService.loadSettings())
    if (cleared) navigate('/', { replace: true })
    else
      setMessage(
        'Some data could not be erased from this device. Please try again before closing the page.',
      )
  }

  return (
    <section>
      <h1>Settings</h1>
      <form className="practice-setup" onSubmit={save}>
        <fieldset>
          <legend>Preferences</legend>
          <label className="selector-option">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) =>
                setSettings({ ...settings, soundEnabled: event.target.checked })
              }
            />
            Sound effects
          </label>
          <label className="selector-option">
            <input
              type="checkbox"
              checked={settings.animationsEnabled}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  animationsEnabled: event.target.checked,
                })
              }
            />
            Card animation
          </label>
          <label className="selector-option">
            <input
              type="checkbox"
              checked={settings.showExplanations}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  showExplanations: event.target.checked,
                })
              }
            />
            Show explanations
          </label>
        </fieldset>
        <label>
          Correct similar answers required for mastery
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            required
            value={settings.masteryThreshold}
            onChange={(event) =>
              setSettings({
                ...settings,
                masteryThreshold: event.target.valueAsNumber,
              })
            }
          />
        </label>
        <h2>Default practice choices</h2>
        <OperationSelector
          selected={settings.defaultOperations}
          onChange={(defaultOperations) =>
            setSettings({ ...settings, defaultOperations })
          }
        />
        <DifficultySelector
          selected={settings.defaultDifficulty}
          onChange={(defaultDifficulty) =>
            setSettings({ ...settings, defaultDifficulty })
          }
        />
        <SessionLengthSelector
          selected={settings.defaultSessionLength as PracticeSessionLength}
          onChange={(defaultSessionLength) =>
            setSettings({ ...settings, defaultSessionLength })
          }
        />
        <button type="submit" className="button">
          Save Settings
        </button>
      </form>
      <p role="status">{message}</p>
      <h2>Clear application data</h2>
      <p>
        This erases your practice history, statistics, mistake patterns, and
        saved settings.
      </p>
      <button
        type="button"
        className="button button-secondary"
        onClick={() => setConfirmClear(true)}
      >
        Clear All Application Data
      </button>
      {confirmClear && (
        <ConfirmDialog
          title="Clear all application data?"
          description="This permanently erases all practice history, statistics, mistake patterns, and settings on this device. This cannot be undone."
          detail="Application defaults will be restored."
          confirmLabel="Yes, clear all application data"
          onConfirm={clearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </section>
  )
}
export default SettingsPage
