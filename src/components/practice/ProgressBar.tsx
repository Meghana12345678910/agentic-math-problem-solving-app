interface ProgressBarProps {
  attempted: number
  total: number
}

function ProgressBar({ attempted, total }: ProgressBarProps) {
  return (
    <div>
      <label htmlFor="session-progress" aria-live="polite" aria-atomic="true">
        Session progress: {attempted} of {total} completed
      </label>
      <progress
        id="session-progress"
        value={attempted}
        max={total}
        aria-valuetext={`${attempted} of ${total} questions completed`}
      />
    </div>
  )
}

export default ProgressBar
