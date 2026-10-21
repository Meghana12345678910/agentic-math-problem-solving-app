import { useSyncExternalStore } from 'react'
import { storageService } from '../../services/storageService'

function StorageWarning() {
  const warning = useSyncExternalStore(
    storageService.subscribe,
    storageService.getWarning,
  )
  return warning ? <p role="alert">{warning}</p> : null
}

export default StorageWarning
