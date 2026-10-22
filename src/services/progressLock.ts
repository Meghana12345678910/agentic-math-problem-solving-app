/** A single lock protects the shared attempt, session and mistake records. */
export function withProgressLock(update: () => void): void | Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    let started = false
    return navigator.locks
      .request('mathPractice.progress', () => {
        started = true
        update()
      })
      .catch((error) => {
        if (started) throw error
        return withDatabaseLock(update)
      })
  }
  return withDatabaseLock(update)
}

/** Read/write transactions on one store serialize callbacks across browser tabs. */
function withDatabaseLock(update: () => void): void | Promise<void> {
  if (typeof indexedDB === 'undefined') return update()
  return new Promise<void>((resolve, reject) => {
    let started = false
    const fallback = () => {
      if (started) return
      started = true
      // Storage-disabled browsers still support one usable, in-memory session.
      try {
        update()
        resolve()
      } catch (error) {
        reject(error)
      }
    }
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open('mathPractice.locks', 1)
    } catch {
      fallback()
      return
    }
    request.onupgradeneeded = () => {
      request.result.createObjectStore('progress')
    }
    request.onerror = fallback
    request.onblocked = fallback
    request.onsuccess = () => {
      const database = request.result
      if (started) {
        database.close()
        return
      }
      try {
        const transaction = database.transaction('progress', 'readwrite')
        const marker = transaction.objectStore('progress').put(0, 'lock')
        marker.onsuccess = () => {
          started = true
          try {
            update()
          } catch (error) {
            reject(error)
            transaction.abort()
          }
        }
        transaction.oncomplete = () => {
          database.close()
          resolve()
        }
        transaction.onabort = () => {
          database.close()
          if (started)
            reject(
              transaction.error ?? new Error('Progress update interrupted'),
            )
          else fallback()
        }
        transaction.onerror = () => {
          /* onabort handles failure. */
        }
      } catch {
        database.close()
        fallback()
      }
    }
  })
}
