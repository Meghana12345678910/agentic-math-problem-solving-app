import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import ConfirmDialog from '../common/ConfirmDialog'

function SessionNavigationGuard({
  active,
  onEnd,
}: {
  active: boolean
  onEnd: () => void
}) {
  const blocker = useBlocker(active)
  useEffect(() => {
    if (!active) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [active])

  if (blocker.state !== 'blocked') return null
  return (
    <ConfirmDialog
      title="Leave this practice session?"
      description="You have a practice session in progress. End it and leave, or keep practicing?"
      detail="Completed answers will stay saved."
      confirmLabel="End session and leave"
      cancelLabel="Keep practicing"
      onCancel={() => blocker.reset()}
      onConfirm={() => {
        onEnd()
        blocker.proceed()
      }}
    />
  )
}
export default SessionNavigationGuard
