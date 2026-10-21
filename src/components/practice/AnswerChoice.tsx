interface AnswerChoiceProps {
  answer: number
  selected: boolean
  disabled: boolean
  onSelect: () => void
}

function AnswerChoice({
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
      disabled={disabled}
      onClick={onSelect}
    >
      {answer}
      {selected && <span className="selected-label">Selected</span>}
    </button>
  )
}

export default AnswerChoice
