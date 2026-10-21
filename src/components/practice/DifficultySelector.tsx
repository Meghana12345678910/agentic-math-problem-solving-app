import type { DifficultyLevel } from '../../types/question'

const difficultyOptions: {
  value: DifficultyLevel
  label: string
  description: string
}[] = [
  {
    value: 1,
    label: 'Beginner',
    description: 'Start with small numbers and simple number facts.',
  },
  {
    value: 2,
    label: 'Easy',
    description: 'Try numbers up to 50 and times tables up to 10.',
  },
  {
    value: 3,
    label: 'Intermediate',
    description: 'Practice larger numbers, carrying, and borrowing.',
  },
  {
    value: 4,
    label: 'Advanced',
    description: 'Challenge yourself with multiple-digit arithmetic.',
  },
]

interface DifficultySelectorProps {
  selected: DifficultyLevel | null
  onChange: (difficulty: DifficultyLevel) => void
}

function DifficultySelector({ selected, onChange }: DifficultySelectorProps) {
  return (
    <fieldset>
      <legend>Difficulty</legend>
      <div className="selector-options">
        {difficultyOptions.map(({ value, label, description }) => (
          <label className="selector-option" key={value}>
            <input
              type="radio"
              name="difficulty"
              checked={selected === value}
              onChange={() => onChange(value)}
              aria-labelledby={`difficulty-${value}-label`}
              aria-describedby={`difficulty-${value}-description`}
            />
            <span>
              <strong id={`difficulty-${value}-label`}>
                Level {value}: {label}
              </strong>
              <span
                className="option-description"
                id={`difficulty-${value}-description`}
              >
                {description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default DifficultySelector
