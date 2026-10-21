import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
}

function PageContainer({ children }: PageContainerProps) {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  const container = useRef<HTMLElement>(null)
  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    // Question cards manage their own focus as each new question appears.
    if (container.current?.querySelector('.question-card')) return
    const heading = container.current?.querySelector('h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus()
    } else container.current?.focus()
  }, [pathname])
  return (
    <main
      ref={container}
      id="main-content"
      className="page-container"
      tabIndex={-1}
    >
      {children}
    </main>
  )
}

export default PageContainer
