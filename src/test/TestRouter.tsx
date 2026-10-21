import { useState } from 'react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { InitialEntry } from 'react-router-dom'

/** Use the same data-router behavior as the app, including navigation blockers. */
export function TestRouter({
  children,
  initialEntries = ['/'],
}: {
  children: ReactNode
  initialEntries?: InitialEntry[]
}) {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: children }], { initialEntries }),
  )
  return <RouterProvider router={router} />
}
