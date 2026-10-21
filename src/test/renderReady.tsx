import { act, render } from '@testing-library/react'

/** Await real route imports and React's Suspense commit before synchronous assertions. */
export async function renderReady(...args: Parameters<typeof render>) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(...args)
    await Promise.all([
      import('../pages/StatisticsPage'),
      import('../pages/SettingsPage'),
    ])
  })
  return result
}
