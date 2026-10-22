import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

afterEach(cleanup)

// Real lazy imports can exceed the default one-second wait on this Windows host.
configure({ asyncUtilTimeout: 5000 })

beforeEach(() => localStorage.clear())
