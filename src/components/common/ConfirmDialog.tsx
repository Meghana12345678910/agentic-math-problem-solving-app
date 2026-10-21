import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent } from 'react'

interface ConfirmDialogProps {
  title?: string
  description?: string
  detail?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  onConfirm,
  onCancel,
  title = 'Reset statistics?',
  description = 'Are you sure you want to erase all practice history and statistics?',
  detail = 'Your settings will stay the same.',
  confirmLabel = 'Yes, reset statistics',
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const cancel = useRef<HTMLButtonElement>(null)
  const confirm = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    cancel.current?.focus()
    return () => {
      previous?.focus()
    }
  }, [])
  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      if (document.activeElement === cancel.current) confirm.current?.focus()
      else cancel.current?.focus()
    }
  }
  return (
    <div className="dialog-backdrop">
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleKey}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <p>{detail}</p>
        <div className="home-actions">
          <button
            ref={cancel}
            type="button"
            className="button button-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            ref={confirm}
            type="button"
            className="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
export default ConfirmDialog
