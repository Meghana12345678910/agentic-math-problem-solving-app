import type { PracticeSessionLength } from '../../types/practiceConfiguration'

interface SessionLengthSelectorProps {
  selected: PracticeSessionLength
  onChange: (length: PracticeSessionLength) => void
}

function SessionLengthSelector({
  selected,
  onChange,
}: SessionLengthSelectorProps) {
  const lengths: PracticeSessionLength[] = [5, 10, 20, 'continuous']
  return (
    <fieldset>
      <legend>Session length</legend>
      <div className="selector-options">
        {lengths.map((length) => (
          <label className="selector-option" key={length}>
            <input
              type="radio"
              name="session-length"
              checked={selected === length}
              onChange={() => onChange(length)}
            />
            {length === 'continuous'
              ? 'Continuous practice'
              : `${length} questions`}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default SessionLengthSelector
