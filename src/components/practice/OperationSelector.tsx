import type { MathOperation } from '../../types/question'

const operationOptions: { value: MathOperation; label: string }[] = [
  { value: 'addition', label: 'Addition' },
  { value: 'subtraction', label: 'Subtraction' },
  { value: 'multiplication', label: 'Multiplication' },
  { value: 'division', label: 'Division' },
]

interface OperationSelectorProps {
  selected: MathOperation[]
  onChange: (operations: MathOperation[]) => void
}

function OperationSelector({ selected, onChange }: OperationSelectorProps) {
  return (
    <fieldset aria-describedby="operations-help">
      <legend>Operations</legend>
      <p id="operations-help">Choose one or more operations.</p>
      <button
        type="button"
        className="button button-secondary"
        onClick={() => onChange(operationOptions.map((option) => option.value))}
      >
        Select all operations
      </button>
      <div className="selector-options">
        {operationOptions.map(({ value, label }) => (
          <label className="selector-option" key={value}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, value]
                    : selected.filter((operation) => operation !== value),
                )
              }
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default OperationSelector
