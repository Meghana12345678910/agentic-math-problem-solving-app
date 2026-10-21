interface AnswerChoiceProps {
  shortcut?: number
  answer: number
  selected: boolean
  disabled: boolean
  onSelect: () => void
}

function AnswerChoice({
  shortcut,
  answer,
  selected,
  disabled,
  onSelect,
}: AnswerChoiceProps) {
  return (
    <button
      type="button"
      className="button button-secondary answer-choice"
      aria-label={`Answer ${answer}`}
      aria-pressed={selected}
      aria-keyshortcuts={shortcut?.toString()}
      disabled={disabled}
      onClick={onSelect}
    >
      {answer}
      {selected && <span className="selected-label">Selected</span>}
    </button>
  )
}

export default AnswerChoice
